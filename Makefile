.PHONY: start dev server install build lint clean help

## Default target
start: ## Start both backend and frontend (production-like dev mode)
	npm run start

dev: ## Alias for start
	npm run start

server: ## Start backend only (port 3001)
	npm run server

frontend: ## Start frontend only (port 5173) — needs backend running separately
	npm run dev

install: ## Install all dependencies
	npm install

build: ## Type-check and build for production
	npm run build

lint: ## Run linter
	npm run lint

clean: ## Remove build artifacts and local database
	pwsh -Command "Remove-Item -Recurse -Force -ErrorAction SilentlyContinue -LiteralPath dist,dist-server,'server/pins.db'; exit 0"

help: ## Show this help
	@echo.
	@echo   start        Start both backend and frontend
	@echo   dev          Alias for start
	@echo   server       Start backend only (port 3001)
	@echo   frontend     Start frontend only (port 5173)
	@echo   install      Install all dependencies
	@echo   build        Type-check and build for production
	@echo   lint         Run linter
	@echo   clean        Remove build artifacts and local database
	@echo.
