import numpy as np
import pandas as pd
import pickle

from prettytable import PrettyTable
from argparse import ArgumentParser
from datetime import datetime
from pprint import PrettyPrinter
from os import path, makedirs, listdir
from numpy import array
from keras.preprocessing.text import Tokenizer, one_hot
from keras.preprocessing.sequence import pad_sequences
from keras.models import Model, Sequential
from keras.utils import to_categorical
from keras.layers import Embedding, concatenate, LSTM, Dropout, Input, Reshape, Dense
from keras.callbacks import ModelCheckpoint, TensorBoard
from utils import get_max_seq_length, encode_and_pad, pad_left

pp = PrettyPrinter(indent=2)

def pprint(obj):
  pp.pprint(obj)

# --- Command Line Arguments ---

parser = ArgumentParser()
parser.add_argument("--max-seq-len", nargs='?', type=int, const=True, default=100)
parser.add_argument("--epochs", nargs='?', type=int, const=True, default=300)
parser.add_argument("--batch-size", nargs='?', type=int, const=True, default=64)
parser.add_argument("--name", nargs='?', type=str, const=True)

args = parser.parse_args()

# --- Parameters ---

max_seq_len = args.max_seq_len
batch_size = args.batch_size
n_epochs = args.epochs

# --- Create Directory ---

out_dir = "./runs"
n_runs = len(listdir(out_dir)) + 1
run_name = args.name if args.name else "run_" + pad_left(n_runs)
run_dir = out_dir + "/" + run_name

if not path.exists(run_dir):
  makedirs(run_dir)
else:
  raise Exception("Cannot create log directory for run. Directory already exists.")

# --- Data Preprocessing ---

tokenizer = Tokenizer(filters='', split=" ", lower=False)

dataframe = pd.read_csv('../data/dataset.csv', engine='python', header=None)
dataset = dataframe.values

n_observations = dataset.shape[0] - 1

function_signatures = dataset[1:,6]
function_bodies = dataset[1:,8]

# merge function names and their implementation into one array for tokenization
inputs = np.concatenate((function_signatures, function_bodies), axis=None)

# tokenize input data and create vocabulary
tokenizer.fit_on_texts(inputs)

# index to word mapping
idx2word = {v: k for k, v in tokenizer.word_index.items()}

# add +1 to leave space for sequence paddings
vocab_size = len(tokenizer.word_index) + 1

# translate each word in text file to the matching vocabulary index
sequences = tokenizer.texts_to_sequences(inputs)

function_signatures = sequences[:n_observations]
function_bodies = sequences[n_observations:]

# signature length is fixed
max_signature_seq_length = get_max_seq_length(function_signatures, max_seq_len)
max_body_seq_length = get_max_seq_length(function_bodies, max_seq_len)

# finalize inputs to the model
X1_signatures, X2_bodies, y = list(), list(), list()
for body_idx, seq in enumerate(function_bodies):

  encoded_signature = encode_and_pad(function_signatures[body_idx], max_signature_seq_length, vocab_size)

  for i in range(1, len(seq)):
    # add function signature
    X1_signatures.append(encoded_signature)

    # add the entire sequence to the input and only keep the next word for the output
    in_seq, out_seq = seq[:i], seq[i]

    # apply padding and encode sequence
    in_seq = pad_sequences([in_seq], maxlen=max_body_seq_length)[0]

    # one hot encode output sequence
    out_seq = to_categorical([out_seq], num_classes=vocab_size)[0]
    y.append(out_seq)

    # cut the input seq to fixed length
    X2_bodies.append(in_seq[-max_seq_len:])

X1_signatures, X2_bodies, y = np.array(X1_signatures), np.array(X2_bodies), np.array(y)

# --- Information ---

infos = PrettyTable()

infos.field_names = ["Info", "Value"]
infos.align["Info"] = "l"
infos.align["Value"] = "l"

infos.add_row(["Epochs", n_epochs])
infos.add_row(["Batch Size", batch_size])
infos.add_row(["Max Sequence", max_seq_len])
infos.add_row(["Observations", max(len(function_signatures), len(function_bodies))])
infos.add_row(["X1 (Signatures)", X1_signatures.shape])
infos.add_row(["X2 (Bodies)", X2_bodies.shape])
infos.add_row(["Y", y.shape])
infos.add_row(["Vocabulary", vocab_size])

print(infos)

# --- Model ---

# encoder
x1_input = Input(shape=X1_signatures[0].shape, name="x1_input")
x1_model = LSTM(256, return_sequences=True, name="x1_lstm_1")(x1_input)
x1_model = Dense(128, activation='relu')(x1_model)

x2_input = Input(shape=X2_bodies[0].shape, name="x2_input")
x2_model = Embedding(vocab_size, 200, input_length=max_seq_len)(x2_input)
x2_model = LSTM(256, return_sequences=True, name="x2_lstm_1")(x2_model)
x2_model = LSTM(256, return_sequences=True, name="x2_lstm_2")(x2_model)
x2_model = Dense(128, activation='relu')(x2_model)

# decoder
decoder = concatenate([x1_model, x2_model])
decoder = LSTM(512, return_sequences=False, name="decoder_lstm")(decoder)
decoder_output = Dense(vocab_size, activation='softmax')(decoder)

# compile model
model = Model(inputs=[x1_input, x2_input], outputs=decoder_output)
model.compile(loss='categorical_crossentropy', optimizer='rmsprop', metrics=['accuracy'])

# callbacks
tensorboard = TensorBoard(run_dir)
callbacks = [tensorboard]

# fit the model
print("Buckle up and hold tight! We are about to start the training...")
model.fit([X1_signatures, X2_bodies], y, epochs=n_epochs, batch_size=batch_size, shuffle=False, callbacks=callbacks)

# save model
model.save(run_dir + '/model.h5')
print("Model successfully saved.")

# save tokenizer
with open('tokenizer.pickle', 'wb') as handle:
  pickle.dump(tokenizer, handle, protocol=pickle.HIGHEST_PROTOCOL)
  print("Tokenizer successfully dumped.")