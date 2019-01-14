from os import path
from keras.models import load_model
from utils import encode_and_pad
from keras.preprocessing.sequence import pad_sequences
import numpy as np
import pickle

from argparse import ArgumentParser

# --- Command Line Arguments ---

parser = ArgumentParser()
parser.add_argument("--run", type=str)

args = parser.parse_args()

if not args.run:
  raise Exception("Please specify a run that you would like to test.")

run_dir = "./runs/" + args.run

if not path.exists(run_dir):
  raise Exception("'{}' does not exist.".format(args.run))

model_file = run_dir + "/model.h5"

if not path.exists(model_file):
  raise Exception("Cannot find 'model.h5'.")

model = load_model(model_file)

tokenizer_file = run_dir + "/tokenizer.pickle"

if not path.exists(tokenizer_file):
  raise Exception("Cannot find 'tokenizer.pickle'.")

with open(tokenizer_file, 'rb') as handle:
  tokenizer = pickle.load(handle)

in_signature = 'function fizzbuzz(num)'
in_text = 'START'
max_tokens = 500
max_seq_len = 100
vocab_size = len(tokenizer.word_index) + 1

signature_seq = tokenizer.texts_to_sequences([in_signature])[0][-max_seq_len:]
signature_seq = encode_and_pad(signature_seq, max_seq_len, vocab_size)
signature_seq = np.array([signature_seq])

idx2word = {v: k for k, v in tokenizer.word_index.items()}

for i in range(max_tokens):
  body_seq = tokenizer.texts_to_sequences([in_text])[0][-max_seq_len:]
  body_seq = pad_sequences([body_seq], maxlen=max_seq_len)
  body_seq = np.array(body_seq)

  # predict next token
  y_hat = model.predict([signature_seq,body_seq], verbose=0)
  y_hat = np.argmax(y_hat)

  # map idx to word
  word = idx2word[y_hat]

  if word is None or word == 'END':
      break

  # append as input for generating the next token
  in_text += ' ' + word

print(in_text)