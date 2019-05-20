# nn-function-generator

Experimenting with automatic generation of TS function bodies using ANN models

## Setup

1. Download `typescript-all-functions.json.gz` and put it inside the `data` directory
2. Run `yarn dataset` to prepare the dataset for training
3. Run `cd model && python train.py` to train the model

## Running the playground

1. Run `cd model && python test-server.py --run run_001`
2. Run `yarn start`
3. Go to `http://localhost:3003/` and have fun!

## Training on Google Cloud TPU

```
ctpu up -preemptible -machine-type n1-highmem-16	
virtualenv ngvikings
source ngvikings/bin/activate
cd model
pip install -r requirements.txt
python train.py --tpu
```
