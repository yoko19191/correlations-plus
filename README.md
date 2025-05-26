# Embedding Correlations

Visualize correlations between text embeddings.

## Setup

```bash
# Install dependencies
npm install

# export your JINA_API_KEY
```

## Usage

1. Generate embeddings from text files:
```bash
npm run embed <input.txt> [options]
```

Options:
- `-c, --chunk <type>`: Chunking type (newline, punctuation, characters, regex)
- `-v, --value <value>`: Value for chunking (number for characters, regex pattern)
- `-d, --dimensions <number>`: Embedding dimensions (default: 1024)
- `-o, --output <path>`: Output JSONL file path

2. Visualize correlations:
```bash
npm run corr <file1.jsonl> [file2.jsonl] [-p port]
```

- If only one file is provided, correlations are computed within the file
- If two files are provided, correlations are computed between them
- Default port is 3000

Example:
```bash
# Generate embeddings
npm run embed test.txt -c newline -o test.txt.jsonl

# Visualize correlations
npm run corr test.txt.jsonl
```

## Features

- Interactive correlation matrix visualization
- Split-panel view with hover text details
- Responsive layout that adapts to screen size
- Multiple view modes:
  - Single panel
  - Vertical split
  - Horizontal split
- Automatic orientation optimization for better screen space utilization
