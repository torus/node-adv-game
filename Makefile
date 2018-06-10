default:
	@echo "run make in a Vagrant instance"

.PHONY: test

init:
	npm install

test:
	docker-compose exec web npm test

schema:
	pg_dump --no-owner --no-privileges --schema-only `whoami` > schema.sql

run-local:
	docker-compose -f docker-compose-notls.yml up
