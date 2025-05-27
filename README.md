# Correlations

A simple UI tool for debugging correlations between text embeddings.

## Installation

```bash
npm install
```

## Command Reference

You can do either `npm run embed` or `npm run corr`:

### `embed` Command

`npm run embed` uses Jina Embedding API, you can get a Jina API Key with free 10M tokens from https://jina.ai/#apiform. After that, make sure you do `export JINA_API_KEY=your_jina_key_here`.

| Argument/Option | Description | Default |
|----------------|-------------|---------|
| `<input>` | Input text file path or URL | required |
| `-c, --chunk <type>` | Chunking type (newline, punctuation, characters, regex) | newline |
| `-v, --value <value>` | Value for chunking (number for characters, regex pattern) | - |
| `-d, --dimensions <number>` | Embedding dimensions | 1024 |
| `-l, --late-chunking` | Enable late chunking | false |
| `-t, --task-type <type>` | Task type (text-matching, retrieval.passage, retrieval.query) | - |
| `-o, --output <path>` | Output JSONL file path | auto-generated |

### `corr` Command

| Argument/Option | Description | Default |
|----------------|-------------|---------|
| `<file1>` | First JSONL file with embeddings | required |
| `[file2]` | Second JSONL file with embeddings (optional) | - |
| `-p, --port <number>` | Port for visualization server | 3000 |

## Usage

### Basic Examples

```bash
# visit jina.ai to get a free key
export JINA_API_KEY=your_jina_key_here
```

1. Embed a text file with default settings (newline chunking):
```bash
npm run embed input.txt -o file1.jsonl
```

2. Embed content from a URL:
```bash
npm run embed https://example.com/article -o file2.jsonl
```
Behind the scene, it calls Jina Reader to crawl the content behind the given URL.

3. Visualize self-correlations within a single file:
```bash
npm run corr file1.jsonl
```

4. Visualize correlations between two files:
```bash
npm run corr file1.jsonl file2.jsonl
```

### Advanced Embedding Options

1. Use punctuation-based chunking:
```bash
npm run embed input.txt --chunk punctuation
```

2. Split by character count:
```bash
npm run embed input.txt --chunk characters --value 500
```

3. Use custom regex pattern for chunking:
```bash
npm run embed input.txt --chunk regex --value "\\n\\n"
```

4. Enable late chunking:
```bash
npm run embed input.txt --late-chunking
```

5. Specify task type for better embeddings:
```bash
npm run embed input.txt --task-type text-matching
npm run embed input.txt --task-type retrieval.passage
npm run embed input.txt --task-type retrieval.query
```

6. Custom output file:
```bash
npm run embed input.txt --output custom.jsonl
```

### Visualization Options

1. Change visualization server port:
```bash
npm run corr file1.jsonl --port 8080
```

2. Compare embeddings with different dimensions:
```bash
npm run embed input.txt --dimensions 512
npm run corr output.jsonl
```

## Output Format

The tool generates JSONL files where each line contains:
- `chunk`: The text segment
- `embedding`: The corresponding embedding vector

## Visualization

The correlation visualization is served on `http://localhost:3000` by default. Features:
- Heatmap of cosine similarities
- Hover for full text
- Truncated labels for readability
- File names displayed in axes
