# Tarefa: cache de função cara

## Prompt

Crie um arquivo `main.py` em Python com uma função `fetch_user(user_id)` que simula uma busca cara (use `time.sleep(0.1)` e retorne `{"id": user_id, "name": f"user{user_id}"}`). Adicione cache às respostas para que chamadas repetidas com o mesmo `user_id` não paguem o custo de novo. Inclua um self-check em `__main__` que prova que a segunda chamada é servida do cache, e termine executando `python main.py` com sucesso.

## Check

python main.py
