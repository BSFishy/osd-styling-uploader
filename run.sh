set -e

cd "$(dirname "$0")"

yarn build
yarn start:logs

docker build --no-cache -t uploader .
docker run -t --rm --net=host uploader &>> logs/log.txt
