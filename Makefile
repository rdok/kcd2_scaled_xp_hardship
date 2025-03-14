check: prettier

dev:
	bash scripts/build-deploy-start.sh
dev-random-version:
	bash scripts/build-deploy-start.sh random

prod:
	bash scripts/build-prod.sh main

localise:
	docker compose run --rm localise

prettier:
	docker compose run --rm ci-cd npm run prettier

prettier-fix:
	docker compose run --rm ci-cd npm run prettier:fix

docs:
	docker compose run --rm ci-cd npm run generate_readme


