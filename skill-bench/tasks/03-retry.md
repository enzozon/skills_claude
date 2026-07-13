# Tarefa: retry com backoff

## Prompt

Crie um arquivo `main.py` em Python com uma função `unreliable()` que falha (levanta `ConnectionError`) nas 2 primeiras chamadas e retorna `"ok"` na terceira (use um contador global ou closure). Adicione um mecanismo de retry com backoff exponencial (base 0.01s para o teste ser rápido, máximo 5 tentativas) para que a chamada tenha sucesso. Inclua um self-check em `__main__` que prova o comportamento, e termine executando `python main.py` com sucesso.

## Check

python main.py
