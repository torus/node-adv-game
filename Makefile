default:
	@echo "run make in a Vagrant instance"

.PHONY: test

init:
	npm install

test:
	npm test

schema:
	pg_dump --no-owner --no-privileges --schema-only `whoami` > schema.sql
