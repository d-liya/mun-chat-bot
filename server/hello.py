from flask import Flask, request
from gpt3 import answer_query
from flask_cors import CORS

# . venv/bin/activate
# flask --app hello run

app = Flask(__name__)
CORS(app)

@app.route("/answer", methods=["GET"])
def hello_world():
    args = request.args
    question = args.get("question")
    if(question is None or question.strip() == ""):
        return "No question provided"
    else:
        return answer_query(question)