FROM node:16-alpine

WORKDIR /usr/src/shuufare

# Install PM2
RUN npm install -g npm pm2 nodemon

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 8080
EXPOSE 8081

# CMD [ "npm", "run", "dev"]
CMD [ "npm", "start" ]
