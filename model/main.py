from os import listdir, getcwd
from numpy import array
from keras.preprocessing.text import Tokenizer, one_hot
from keras.preprocessing.sequence import pad_sequences
from keras.models import Model, Sequential
from keras.utils import to_categorical
from keras.layers import Embedding, concatenate, LSTM, Dropout, Input, Reshape, Dense
import numpy as np
import pandas as pd

# --- Parameters ---

max_seq_len = 100

# ---

tokenizer = Tokenizer(filters='', split=" ", lower=False)

dataframe = pd.read_csv('../data/dataset.csv', engine='python', header=None)
dataset = dataframe.values

n_observations = dataset.shape[0] - 1

function_signatures = dataset[1:,6]
function_bodies = dataset[1:,7]

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

def get_max_seq_length(seqs):
  length = max(len(s) for s in seqs)
  return max_seq_len if length < max_seq_len else length

# signature length is fixed
max_signature_seq_length = get_max_seq_length(function_signatures)
max_body_seq_length = get_max_seq_length(function_bodies)

print(function_signatures)
print(function_bodies)

print('----------------')

def encode_and_pad(seq, max_length=None):
  one_hot_encoded = list()

  if max_length:
    seq = pad_sequences([seq], maxlen=max_length)[0]

  return [to_categorical([token], num_classes=vocab_size)[0] for token in seq]

# finalize inputs to the model
X1_signatures, X2_bodies, y = list(), list(), list()
for body_idx, seq in enumerate(function_bodies):

  encoded_signature = encode_and_pad(function_signatures[body_idx], max_signature_seq_length)

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

print(X1_signatures.shape)
print(X2_bodies.shape)
print(y.shape)

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
model.compile(loss='categorical_crossentropy', optimizer='rmsprop')

model.fit([X1_signatures, X2_bodies], y, epochs=10, batch_size=64, shuffle=False)
