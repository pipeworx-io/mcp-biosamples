interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * EBI BioSamples MCP.
 *
 * Wraps the keyless EBI BioSamples database — metadata for biological samples
 * (cell lines, tissues, organisms) referenced across EBI archives. Search
 * samples by organism/tissue/keyword and fetch a sample's characteristics.
 * Keyless.
 */


const BASE = 'https://www.ebi.ac.uk/biosamples';
const UA = 'pipeworx/1.0 (+https://pipeworx.io)';

const tools: McpToolExport['tools'] = [
  {
    name: 'search_samples',
    description:
      'Search EBI BioSamples — metadata for biological samples (cell lines, tissues, organisms) referenced across EBI archives. Free-text search by organism, tissue, or keyword; returns matching samples with accession, name, organism, and release date. Keyless.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Free-text query — organism, tissue, cell type, or any keyword (e.g. "liver", "Homo sapiens", "cancer cell line").',
        },
        limit: { type: 'number', description: 'Max results to return (default 15, max 100).' },
        page: { type: 'number', description: 'Zero-based page number (default 0).' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_sample',
    description:
      'Fetch a single EBI BioSamples record by accession. Returns the sample name, dates, taxId, organism, and a flattened map of its characteristics (organism, tissue, sex, cell type, etc.). Keyless.',
    inputSchema: {
      type: 'object',
      properties: {
        accession: {
          type: 'string',
          description: 'A BioSamples accession like "SAMEA4451650", "SAMD00004696", or "SAMN...".',
        },
      },
      required: ['accession'],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  try {
    switch (name) {
      case 'search_samples':
        return await searchSamples(args);
      case 'get_sample':
        return await getSample(args);
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

async function searchSamples(args: Record<string, unknown>): Promise<unknown> {
  const query = reqStr(args, 'query', '"liver"');
  let limit = typeof args.limit === 'number' ? args.limit : 15;
  if (!Number.isFinite(limit) || limit < 1) limit = 15;
  if (limit > 100) limit = 100;
  let page = typeof args.page === 'number' ? args.page : 0;
  if (!Number.isFinite(page) || page < 0) page = 0;

  const url = `${BASE}/samples?text=${encodeURIComponent(query)}&size=${encodeURIComponent(String(limit))}&page=${encodeURIComponent(String(page))}`;
  const data = (await getJson(url)) as BioSearchResponse;

  const samples = data?._embedded?.samples ?? [];
  const out = samples.map((s) => ({
    accession: s.accession,
    name: s.name,
    organism: firstText(s.characteristics, 'organism'),
    release: s.release,
    taxId: s.taxId,
  }));

  return {
    total: data?.page?.totalElements ?? out.length,
    count: out.length,
    samples: out,
  };
}

async function getSample(args: Record<string, unknown>): Promise<unknown> {
  const accession = reqStr(args, 'accession', '"SAMEA4451650"');
  const url = `${BASE}/samples/${encodeURIComponent(accession)}`;

  const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': UA } });
  if (res.status === 404) return { error: 'sample not found', accession };
  if (!res.ok) {
    const body = await res.text().then((t) => t.slice(0, 200)).catch(() => '');
    throw new Error(`BioSamples: ${res.status} ${body}`);
  }
  const s = (await res.json()) as BioSample;

  const characteristics: Record<string, string> = {};
  if (s.characteristics && typeof s.characteristics === 'object') {
    for (const [key, values] of Object.entries(s.characteristics)) {
      const text = Array.isArray(values) && values.length > 0 ? values[0]?.text : undefined;
      if (typeof text === 'string') characteristics[key] = text;
    }
  }

  return {
    accession: s.accession,
    name: s.name,
    release: s.release,
    update: s.update,
    taxId: s.taxId,
    organism: firstText(s.characteristics, 'organism'),
    characteristics,
    external_references_count: Array.isArray(s.externalReferences) ? s.externalReferences.length : 0,
  };
}

interface BioCharacteristicValue {
  text?: string;
  ontologyTerms?: string[];
}
interface BioSample {
  accession: string;
  name?: string;
  release?: string;
  update?: string;
  taxId?: number;
  characteristics?: Record<string, BioCharacteristicValue[]>;
  externalReferences?: unknown[];
}
interface BioSearchResponse {
  _embedded?: { samples?: BioSample[] };
  page?: { size?: number; totalElements?: number; totalPages?: number; number?: number };
}

function firstText(
  characteristics: Record<string, BioCharacteristicValue[]> | undefined,
  key: string,
): string | undefined {
  const values = characteristics?.[key];
  if (Array.isArray(values) && values.length > 0) {
    const text = values[0]?.text;
    if (typeof text === 'string') return text;
  }
  return undefined;
}

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': UA } });
  if (!res.ok) {
    const body = await res.text().then((t) => t.slice(0, 200)).catch(() => '');
    throw new Error(`BioSamples: ${res.status} ${body}`);
  }
  return res.json();
}

function reqStr(args: Record<string, unknown>, key: string, example: string): string {
  const v = args[key];
  if (typeof v !== 'string' || !v.trim()) {
    throw new Error(`Required argument "${key}" is missing. Pass a string like ${example}.`);
  }
  return v;
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
