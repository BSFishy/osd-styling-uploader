set -e

cd "$(dirname "$0")"

docker build --no-cache -t uploader:latest --file backfill.Dockerfile .
docker run -t --rm --net=host uploader
docker rmi -f uploader
