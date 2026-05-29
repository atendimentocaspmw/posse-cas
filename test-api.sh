#!/bin/bash

# Script de teste para a API de upload
# Uso: bash test-api.sh

API_URL="http://localhost:3001"

echo "Testando saúde do servidor..."
curl -s "${API_URL}/api/health" | json_pp

echo -e "\n\nTodos os testes concluídos!"
