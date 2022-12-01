import json
import numpy as np
import openai
import csv
import os
import pandas as pd  
from transformers import GPT2TokenizerFast


MODEL_NAME = "curie"
DOC_EMBEDDINGS_MODEL = f"text-search-{MODEL_NAME}-doc-001"
QUERY_EMBEDDINGS_MODEL = f"text-search-{MODEL_NAME}-query-001"
COMPLETIONS_MODEL = f"text-{MODEL_NAME}-001"
MAX_SECTION_LEN = 500
SEPARATOR = "\n* "
COMPLETIONS_API_PARAMS = {
    # We use temperature of 0.0 because it gives the most predictable, factual answer.
    "temperature": 0.0,
    "max_tokens": 300,
    "model": COMPLETIONS_MODEL,
}

tokenizer = GPT2TokenizerFast.from_pretrained("gpt2")
openai.api_key = OPENAI_API_KEY

def read_dataset_json(filename: str) -> list[dict]:
    f = open(filename)
    data = json.load(f)
    f.close()
    return data["data"]

def get_embedding(text: str, model: str) -> list[float]:
    result = openai.Embedding.create(
      model=model,
      input=text
    )
    return result["data"][0]["embedding"]

def get_doc_embedding(text: str) -> list[float]:
    return get_embedding(text, DOC_EMBEDDINGS_MODEL)

def get_query_embedding(text: str) -> list[float]:
    return get_embedding(text, QUERY_EMBEDDINGS_MODEL)

def count_tokens(text: str) -> int:
    return len(tokenizer.encode(text))


def compute_num_tokens(df: list[dict]) -> dict[tuple[str, str], list]:
    result = {}
    for r in df:
        result[(r["title"], r["heading"])] = [r["content"], count_tokens(r["content"].replace("\n", " "))]
    return result

def compute_doc_embeddings(df: list[dict]) -> dict[tuple[str, str], list[float]]:
    return {
        (r["title"], r["heading"]): get_doc_embedding(r["content"].replace("\n", " ")) for r in df
    }

def vector_similarity(x: list[float], y: list[float]) -> float:
    return np.dot(np.array(x), np.array(y))

def order_document_sections_by_query_similarity(query: str, contexts: dict[(str, str), np.array]) -> list[(float, (str, str))]:
    query_embedding = get_query_embedding(query)
    
    document_similarities = sorted([
        (vector_similarity(query_embedding, doc_embedding), doc_index) for doc_index, doc_embedding in contexts.items()
    ], reverse=True)
    
    return document_similarities

def write_tokenzied_data_to_csv(data: dict[tuple[str, str], list]):
    res = []
    for k in data:
        temp = (k[0],k[1],*data[k])
        res.append(temp)
    df = pd.DataFrame(res, columns=["title", "heading", "content", "tokens"])
    df = df[df.tokens>40]
    df = df.drop_duplicates(['title','heading'])
    df = df.reset_index().drop('index',axis=1) # reset index
    df.head()
    df.to_csv('test.csv', index=False)

def write_dataset_csv(filename: str, data: dict[tuple[str, str], list[float]], header: list[str] = None):
    if header is None:
        header = ["title", "heading"]
        max_dim = max([len(values) for values in data.values()])
        for i in range(max_dim):
            header.append(i)
    with open(filename+'.csv', 'w', encoding='UTF8') as f:
        writer = csv.writer(f)

        # write the header
        writer.writerow(header)

        # write the data
        for key in data:
            writer.writerow([key[0], key[1], *data[key]])

def load_embeddings(fname: str) -> dict[tuple[str, str], list[float]]:
    df = pd.read_csv(fname, header=0)
    max_dim = max([int(c) for c in df.columns if c != "title" and c != "heading"])
    return {
           (r.title, r.heading): [r[str(i)] for i in range(max_dim + 1)] for _, r in df.iterrows()
    }



separator_len = len(tokenizer.tokenize(SEPARATOR))

def construct_prompt(question: str, context_embeddings: dict, df: pd.DataFrame) -> str:
    most_relevant_document_sections = order_document_sections_by_query_similarity(question, context_embeddings)
    
    chosen_sections = []
    chosen_sections_len = 0
    chosen_sections_indexes = []
     
    for _, section_index in most_relevant_document_sections:
        # Add contexts until we run out of space.        
        print(section_index)
        document_section = df.loc[section_index[1]]
        
        chosen_sections_len += document_section.tokens + separator_len
        if chosen_sections_len > MAX_SECTION_LEN:
            break
            
        chosen_sections.append(SEPARATOR + document_section.content.replace("\n", " "))
        chosen_sections_indexes.append(str(section_index))
            
    # Useful diagnostic information
    print(f"Selected {len(chosen_sections)} document sections:")
    print("\n".join(chosen_sections_indexes))
    
    header = """Answer the question as truthfully as possible using the provided context, and if the answer is not contained within the text below, say "I don't know. :)"\n\nContext:\n"""
    
    return header + "".join(chosen_sections) + "\n\n Q: " + question + "\n A:"



def answer_query_with_context(
    query: str,
    df: pd.DataFrame,
    document_embeddings: dict[(str, str), np.array],
    show_prompt: bool = False
) -> str:
    prompt = construct_prompt(
        query,
        document_embeddings,
        df
    )
    
    if show_prompt:
        print(prompt)

    response = openai.Completion.create(
                prompt=prompt,
                **COMPLETIONS_API_PARAMS
            )

    return response["choices"][0]["text"].strip(" \n")

def main():
    # df = read_dataset_json("data.json")
    # tokenzied = compute_num_tokens(df)
    # write_tokenzied_data_to_csv(tokenzied)

    df = pd.read_csv("test.csv", header=0)
    df.index = df["heading"]
    document_embeddings = load_embeddings("embedded.csv")
    query = "What courses do i have to do to get a degree in bio chemistry?"
    answer = answer_query_with_context(query, df, document_embeddings)  
    print(f"\nQ: {query}\nA: {answer}")


def answer_query(query:str) -> str:
    df = pd.read_csv("test.csv", header=0)
    df.index = df["heading"]
    document_embeddings = load_embeddings("embedded.csv")
    answer = answer_query_with_context(query, df, document_embeddings)  
    print(f"\nQ: {query}\nA: {answer}")
    return answer

