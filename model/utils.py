import numpy as np
from keras.utils import to_categorical
from keras.preprocessing.sequence import pad_sequences

def get_max_seq_length(seqs, max_seq_len=None):
  length = max(len(s) for s in seqs)
  return max_seq_len if length < max_seq_len else length

def encode_and_pad(seq, max_length=None, num_classes=None):
  one_hot_encoded = list()

  if max_length:
    seq = pad_sequences([seq], maxlen=max_length)[0]

  return [to_categorical([token], num_classes=num_classes)[0] for token in seq]

def pad_left(i, width=4):
  return str(i).zfill(width)

def prepare_dataset(raw_x1, raw_x2, max_seq_len, vocab_size):
  max_x1_seq_length = get_max_seq_length(raw_x1, max_seq_len)
  max_x2_seq_length = get_max_seq_length(raw_x2, max_seq_len)

  x1, x2, y = list(), list(), list()
  for x2_idx, seq in enumerate(raw_x2):

    x1_encoded = encode_and_pad(raw_x1[x2_idx], max_x1_seq_length, vocab_size)

    for i in range(1, len(seq)):
      # add function signature
      x1.append(x1_encoded)

      # add the entire sequence to the input and only keep the next word for the output
      in_seq, out_seq = seq[:i], seq[i]

      # apply padding and encode sequence
      in_seq = pad_sequences([in_seq], maxlen=max_x2_seq_length)[0]

      # one hot encode output sequence
      out_seq = to_categorical([out_seq], num_classes=vocab_size)[0]
      y.append(out_seq)

      # cut the input seq to fixed length
      x2.append(in_seq[-max_seq_len:])

  x1, x2, y = np.array(x1), np.array(x2), np.array(y)
  return x1, x2, y

"""
This function can be used to debug the preprocessed dataset and print out
encoded inputs as well as the label.

Be aware of calling this function on a large dataset as it will produce dozens
of print statemenets.
"""
def check_encoding(x1, x2, y, idx2word):
  print("--- Check Encoding ---")
  for idx, x1_one_hot in enumerate(x1):
    x1_decoded = ""
    x2_decoded = ""
    y_decoded = ""

    # decode one hot encoding for x1
    for x1_encoded in x1_one_hot:
      x1_argmax = np.argmax(x1_encoded)
      if x1_argmax != 0:
        x1_decoded += " " + idx2word[x1_argmax]

    # decode x2
    for x2_encoded_num in reversed(x2[idx]):
      if x2_encoded_num != 0:
        x2_decoded = idx2word[x2_encoded_num] + " " + x2_decoded

    y_encoded = y[idx]
    y_argmax = np.argmax(y_encoded)
    if y_argmax != 0:
      y_decoded = idx2word[y_argmax]

    print("X1", idx, x1_decoded)
    print("X2", idx, x2_decoded)
    print("Y", idx, y_decoded)
    print("---")