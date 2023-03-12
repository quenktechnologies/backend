.DELETE_ON_ERROR:
lib: $(shell find src -type f)
	rm -R lib 2> /dev/null || true 
	mkdir lib
	cp -R -u src/* lib
	./node_modules/.bin/tsc --project lib

.PHONY: precommit
precommit:
	make format && make lint

.PHONY: format
format:
	./node_modules/.bin/prettier --write {src,test}/**/*.{ts,js,json} $(ARGS)

.PHONY: lint
lint:
	./node_modules/.bin/eslint {src,test}/**/*.{ts,js}  $(ARGS)
