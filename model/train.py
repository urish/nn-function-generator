import numpy as np
import pandas as pd
import os
import pickle
import tensorflow as tf

from prettytable import PrettyTable
from argparse import ArgumentParser
from datetime import datetime
from pprint import PrettyPrinter
from os import path, makedirs, listdir
from os.path import join
from numpy import array
from tensorflow.keras.preprocessing.text import Tokenizer, one_hot
from tensorflow.keras.preprocessing.sequence import pad_sequences
from tensorflow.keras.models import Model, Sequential
from tensorflow.keras.utils import to_categorical
from tensorflow.keras.layers import Embedding, concatenate, LSTM, BatchNormalization, Dropout, Input, Reshape, Dense, TimeDistributed
from tensorflow.python.keras.callbacks import ModelCheckpoint, TensorBoard
from utils import pad_left, prepare_dataset, check_encoding
from sklearn.model_selection import train_test_split

pp = PrettyPrinter(indent=2)

def pprint(obj):
  pp.pprint(obj)

# --- Command Line Arguments ---

boolean = lambda x: (str(x).lower() == 'true')

parser = ArgumentParser()
parser.add_argument("--max-seq-len", nargs='?', type=int, const=True, default=100)
parser.add_argument("--epochs", nargs='?', type=int, const=True, default=200)
parser.add_argument("--batch-size", nargs='?', type=int, const=True, default=512)
parser.add_argument("--dropout", nargs='?', type=float, const=True, default=0.4)
parser.add_argument("--recurrent-dropout", nargs='?', type=float, const=True, default=0.2)
parser.add_argument("--name", nargs='?', type=str, const=True)
parser.add_argument("--dry-run", nargs='?', type=boolean, const=True, default=False)
parser.add_argument("--tpu", nargs='?', type=boolean, const=True, default=False)

args = parser.parse_args()

dry_run = args.dry_run

if dry_run:
  print("[INFO] Running script in dry mode.")

# --- Parameters ---

max_seq_len = args.max_seq_len
batch_size = args.batch_size
n_epochs = args.epochs
dropout = args.dropout
recurrent_dropout = args.recurrent_dropout

# --- Create Directory ---

if not dry_run:
  out_dir = "./runs"

  if not path.exists(out_dir):
    makedirs(out_dir)

  n_runs = len(listdir(out_dir)) + 1
  run_name = args.name if args.name else "run_" + pad_left(n_runs, 3)
  run_dir = out_dir + "/" + run_name

  if not path.exists(run_dir):
    makedirs(run_dir)
  else:
    raise Exception("Cannot create log directory for run. Directory already exists.")

# --- Data Preprocessing ---

tokenizer = Tokenizer(filters='', split=" ", lower=False)

dataframe = pd.read_csv('../data/dataset.csv', engine='python')
dataset = dataframe.values

n_observations = dataset.shape[0]

function_signatures = dataframe[['prolog']].values
function_bodies = dataframe[['body']].values

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

# train, test split
seed = 1
test_size=0.33
x1_train, x1_test, x2_train, x2_test = train_test_split(function_signatures, function_bodies, test_size=test_size, random_state=seed)

# finalize inputs to the model
x1_train, x2_train, y_train = prepare_dataset(x1_train, x2_train, max_seq_len, vocab_size)
x1_test, x2_test, y_test = prepare_dataset(x1_test, x2_test, max_seq_len, vocab_size)

with open(join(run_dir, 'metadata.tsv'), 'w') as f:
    y_decoded = [idx2word[np.argmax(encoded)]  for encoded in y_test]
    np.savetxt(f, y_decoded, fmt='%s')

# --- Information ---

infos = PrettyTable()

infos.field_names = ["Info", "Value"]
infos.align["Info"] = "l"
infos.align["Value"] = "l"

infos.add_row(["Epochs", n_epochs])
infos.add_row(["Batch Size", batch_size])
infos.add_row(["Dropout", dropout])
infos.add_row(["Recurrent Dropout", recurrent_dropout])
infos.add_row(["Max Sequence", max_seq_len])
infos.add_row(["Test Size", test_size])
infos.add_row(["Observations (Raw)", max(len(function_signatures), len(function_bodies))])
infos.add_row(["Observations (Train)", max(len(x1_train), len(x2_train))])
infos.add_row(["Observations (Test)", max(len(x1_test), len(x2_test))])
infos.add_row(["X1 (Signatures)", x1_train.shape])
infos.add_row(["X2 (Bodies)", x2_train.shape])
infos.add_row(["Y", y_train.shape])
infos.add_row(["Vocabulary", vocab_size])

print(infos)

# --- Model ---

# encoder
x1_input = Input(shape=x1_train[0].shape, name="x1_input")
x1_model = Embedding(vocab_size, 100, input_length=max_seq_len)(x1_input)
x1_model = LSTM(256, return_sequences=True, dropout=dropout, recurrent_dropout=recurrent_dropout, name="x1_lstm_1")(x1_model)
x1_model = BatchNormalization()(x1_model)
x1_model = Dense(128, activation="relu", name="x1_out_hidden")(x1_model)

x2_input = Input(shape=x2_train[0].shape, name="x2_input")
x2_model = Embedding(vocab_size, 200, input_length=max_seq_len)(x2_input)
x2_model = LSTM(256, return_sequences=True, dropout=dropout, recurrent_dropout=recurrent_dropout, name="x2_lstm_1")(x2_model)
x2_model = LSTM(256, return_sequences=True, dropout=dropout, recurrent_dropout=recurrent_dropout, name="x2_lstm_2")(x2_model)
x2_model = BatchNormalization()(x2_model)
x2_model = Dense(128, activation="relu", name="x2_out_hidden")(x2_model)

# decoder
decoder = concatenate([x1_model, x2_model])
decoder = LSTM(512, return_sequences=False, name="decoder_lstm")(decoder)
decoder_output = Dense(vocab_size, activation='softmax')(decoder)

# compile model
model = Model(inputs=[x1_input, x2_input], outputs=decoder_output)
model.compile(loss='categorical_crossentropy', optimizer='rmsprop', metrics=['accuracy'])

if args.tpu:
  model = tf.contrib.tpu.keras_to_tpu_model(
    model, strategy=tf.contrib.tpu.TPUDistributionStrategy(
      tf.contrib.cluster_resolver.TPUClusterResolver()))

if not dry_run:
  # set up callbacks
  tensorboard = TensorBoard(log_dir=run_dir,
    batch_size=batch_size,
    embeddings_freq=1,
    embeddings_layer_names=['x1_out_hidden', 'x2_out_hidden'],
    embeddings_metadata='metadata.tsv',
    embeddings_data=[x1_test, x2_test])

  callbacks = [tensorboard]

  # fit the model
  print("Buckle up and hold tight! We are about to start the training...")
  validation_data = ([x1_test, x2_test], y_test)
  model.fit([x1_train, x2_train], y_train, validation_data=validation_data, epochs=n_epochs,
            batch_size=batch_size, shuffle=False, callbacks=callbacks)

  # save model
  model.save(run_dir + '/model.h5')
  print("Model successfully saved.")

  # save tokenizer
  with open(run_dir + '/tokenizer.pickle', 'wb') as handle:
    pickle.dump(tokenizer, handle, protocol=pickle.HIGHEST_PROTOCOL)
    print("Tokenizer successfully dumped.")