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