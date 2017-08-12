default:
	@echo "run make in a Vagrant instance"

.PHONY: test

init:
	npm install

test:
	npm test
