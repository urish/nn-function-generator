FROM tensorflow/tensorflow:1.13.1-py3

# Install Node.js and Yarn
RUN apt-get update
RUN apt-get install -y curl apt-transport-https ca-certificates python-software-properties
RUN curl -sL https://deb.nodesource.com/setup_10.x | bash -
RUN curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
RUN echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list
RUN apt-get update && apt-get install -y nodejs yarn

# Install Python dependenices
ADD model/requirements.txt /app/model/
WORKDIR /app/model
RUN pip install -r requirements.txt

# Install Node.js dependenices
WORKDIR /app
ADD package.json yarn.lock /app/
RUN yarn

# Copy JavaScript & Python code
ADD model model/
ADD src src/

EXPOSE 3003
CMD python model/test-server.py --run run_001 & yarn start
