#!/bin/bash

# Directorio del script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
VENV_DIR="$SCRIPT_DIR/calculator_env"

# Crear un entorno virtual si no existe
if [ ! -d "$VENV_DIR" ]; then
  echo "Creando entorno virtual..."
  python3 -m venv "$VENV_DIR"
fi

# Activar el entorno virtual
source "$VENV_DIR/bin/activate"

# Instalar las dependencias
echo "Instalando dependencias..."
pip install -r "$SCRIPT_DIR/requirements.txt"

# Ejecutar el servidor
echo "Ejecutando servidor..."
python "$SCRIPT_DIR/server_calculatora.py"
