all: build
run: build prod_start
debug: build debug_start

HOST_PORT = 8000
CONTAINER_PORT = 5000
NAME = groupme_discord_bot

build: Dockerfile
	docker build -t $(NAME) .

prod_start:
	docker run --rm -itd --name $(NAME) -p $(HOST_PORT):$(CONTAINER_PORT) $(NAME)

debug_start:
	docker run -it --rm --name $(NAME) -p $(HOST_PORT):$(CONTAINER_PORT) $(NAME) /bin/sh

shell:
	docker exec -it $(NAME) /bin/sh

stop:
	-docker kill $(NAME)
