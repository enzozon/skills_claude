# Rubrica do juiz

Você é um revisor de código sênior. Avalie o código Python abaixo, escrito para a tarefa descrita. Responda APENAS com JSON válido, sem markdown:

```
{"correctness": 0-10, "simplicity": 0-10, "readability": 0-10, "nota": "uma frase"}
```

- **correctness**: resolve a tarefa? O self-check é real (falharia se a lógica quebrasse)?
- **simplicity**: usa a solução mais simples que funciona? Penalize abstrações não pedidas (classes desnecessárias, config para valores fixos, dependências onde stdlib basta). Recompense uso de stdlib (`functools`, `csv`, etc.).
- **readability**: um dev júnior entende em uma leitura?

Tarefa e código seguem abaixo.
