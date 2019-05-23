from flask import Flask, request
from test import predict
app = Flask(__name__)

@app.route("/")
def index():
  signature = request.args.get('signature')
  print(signature)
  result = predict(signature)
  print(result)
  return result

if __name__ == '__main__':
  app.run(debug=False, threaded=False)
