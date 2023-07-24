set -e

cd "$(dirname "$0")"

docker build -t uploader --file backfill.Dockerfile .
docker run -t --rm --net=host uploader
