from flask import Flask, request
from test import predict 
app = Flask(__name__)

@app.route("/")
def hello():
    signature = request.args.get('signature')
    result = predict(signature)
    return result

if __name__ == '__main__':
    app.run()
