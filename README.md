# mcp-biosamples

EBI BioSamples MCP.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `search_samples` | Search EBI BioSamples — metadata for biological samples (cell lines, tissues, organisms) referenced across EBI archives. Free-text search by organism, tissue, or keyword; returns matching samples with accession, name, organism, and release date. Keyless. |
| `get_sample` | Fetch a single EBI BioSamples record by accession. Returns the sample name, dates, taxId, organism, and a flattened map of its characteristics (organism, tissue, sex, cell type, etc.). Keyless. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "biosamples": {
      "url": "https://gateway.pipeworx.io/biosamples/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Biosamples data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
