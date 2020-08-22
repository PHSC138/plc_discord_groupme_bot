all: build
run: stop prod_start
debug: stop debug_start

HOST_PORT = 8000
CONTAINER_PORT = 5000
NAME = discord_bot
FNAME = $(NAME)-build-and-run

build: Dockerfile
	docker build -t $(FNAME) .

prod_start:
	docker run --rm -itd --name $(FNAME) -p $(HOST_PORT):$(CONTAINER_PORT) $(FNAME)

debug_start:
	docker run -it --rm --name $(FNAME) -p $(HOST_PORT):$(CONTAINER_PORT) $(FNAME) /bin/sh

shell:
	docker exec -it $(FNAME) /bin/sh

stop:
	-docker kill $(FNAME)
