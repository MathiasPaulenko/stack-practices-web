---
contentType: recipes
slug: cli-tool-argument-parsing
title: "Herramienta CLI con Parseo de Argumentos"
description: "Cómo construir una interfaz de línea de comandos profesional con parseo de argumentos, flags y subcomandos."
metaDescription: "Aprende a construir herramientas CLI en Python, JavaScript y Java. Cubre argparse, commander.js, picocli, subcomandos, flags y validación."
difficulty: intermediate
topics:
  - devops
tags:
  - devops
  - argument-parsing
relatedResources:
  - /recipes/background-jobs
  - /recipes/environment-variables
  - /recipes/health-check-endpoint
  - /recipes/cron-jobs
  - /patterns/abstract-factory-pattern
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende a construir herramientas CLI en Python, JavaScript y Java. Cubre argparse, commander.js, picocli, subcomandos, flags y validación."
  keywords:
    - cli tool python argparse
    - commander.js cli javascript
    - picocli java tutorial
    - subcomandos cli herramientas
    - argument parsing best practices
---
## Visión General

Las herramientas de línea de comandos son la columna vertebral de flujos de trabajo de desarrolladores, automatización DevOps y pipelines de procesamiento de datos. Un CLI bien diseñado tiene subcomandos claros, defaults sensatos, mensajes de error útiles y ayuda auto-generada. Esta receta cubre la construcción de herramientas CLI profesionales con parseo de argumentos, validación y subcomandos en Python, JavaScript y Java.

## Cuándo Usar

Usa este recurso cuando:
- Construyas herramientas internas para desarrolladores, scripts de deployment o utilidades de automatización
- Crees pipelines de procesamiento de datos o ETL disparados desde la terminal
- Expongas funcionalidad de aplicación a sysadmins y pipelines CI/CD
- Escribas scripts que necesitan más que unos pocos argumentos para mantenerse manejables

## Solución

### Python (argparse + typer)

```python
import argparse
import sys

# argparse clásico
def main():
    parser = argparse.ArgumentParser(description="Deploy CLI tool")
    parser.add_argument("environment", choices=["dev", "staging", "prod"], help="Entorno objetivo")
    parser.add_argument("--version", default="latest", help="Versión de app a deployar")
    parser.add_argument("--dry-run", action="store_true", help="Simular sin cambios")
    parser.add_argument("-v", "--verbose", action="store_true", help="Salida verbose")

    args = parser.parse_args()
    print(f"Deploying {args.version} to {args.environment}")
    if args.dry_run:
        print("(modo dry run)")

if __name__ == "__main__":
    main()

# Alternativa moderna: Typer (type hints, docs auto)
import typer
app = typer.Typer()

@app.command()
def deploy(environment: str, version: str = "latest", dry_run: bool = False):
    typer.echo(f"Deploying {version} to {environment}")
    if dry_run:
        typer.echo("(modo dry run)")

if __name__ == "__main__":
    app()
```

### JavaScript (commander.js + yargs)

```javascript
const { Command } = require("commander");
const program = new Command();

program
  .name("deploy-cli")
  .description("CLI para deployments de app")
  .version("1.0.0");

program
  .command("deploy <environment>")
  .description("Deployar a un entorno")
  .option("-v, --version <ver>", "Versión de app", "latest")
  .option("--dry-run", "Simular sin cambios", false)
  .option("--verbose", "Salida verbose", false)
  .action((environment, options) => {
    console.log(`Deploying ${options.version} to ${environment}`);
    if (options.dryRun) console.log("(modo dry run)");
  });

program.parse();

// Alternativa: yargs con validación
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");

yargs(hideBin(process.argv))
  .command("deploy <env>", "Deployar a entorno", (yargs) => {
    return yargs
      .positional("env", { describe: "Entorno objetivo", choices: ["dev", "staging", "prod"] })
      .option("version", { alias: "v", default: "latest" })
      .option("dry-run", { type: "boolean", default: false });
  }, (argv) => {
    console.log(`Deploying ${argv.version} to ${argv.env}`);
  })
  .demandCommand(1, "Necesitas al menos un comando")
  .help()
  .argv;
```

### Java (picocli)

```java
import picocli.CommandLine;
import picocli.CommandLine.Command;
import picocli.CommandLine.Option;
import picocli.CommandLine.Parameters;
import java.util.concurrent.Callable;

@Command(name = "deploy-cli", description = "CLI para deployments de app", version = "1.0.0")
public class DeployCli implements Callable<Integer> {

    @Parameters(index = "0", description = "Entorno objetivo", arity = "1")
    private String environment;

    @Option(names = {"-v", "--version"}, description = "Versión de app", defaultValue = "latest")
    private String version;

    @Option(names = "--dry-run", description = "Simular sin cambios")
    private boolean dryRun;

    @Option(names = {"-V", "--verbose"}, description = "Salida verbose")
    private boolean verbose;

    @Override
    public Integer call() {
        System.out.printf("Deploying %s to %s%n", version, environment);
        if (dryRun) System.out.println("(modo dry run)");
        return 0;
    }

    public static void main(String[] args) {
        int exitCode = new CommandLine(new DeployCli()).execute(args);
        System.exit(exitCode);
    }
}
```

## Explicación

Un buen framework CLI maneja las partes aburridas para que te enfoques en la lógica de negocio:

- **Parseo**: Divide `deploy prod --version 2.1.0 --dry-run` en un objeto estructurado
- **Validación**: Rechaza entornos inválidos, enforce flags requeridos, valida tipos (número, booleano, lista de choices)
- **Generación de ayuda**: Construye automáticamente la salida `--help` desde tus definiciones
- **Subcomandos**: Organiza herramientas complejas en comandos lógicos (`git push`, `git pull`, `git log`)
- **Códigos de salida**: Retorna `0` en éxito y distinto de cero en error para que CI/CD y shell scripts reaccionen correctamente

## Variantes

| Lenguaje | Librería | Estilo | Ideal Para |
|----------|----------|--------|------------|
| Python | `argparse` | Stdlib, imperativo | Sin dependencias, scripts |
| Python | `typer` | Type hints, moderno | Desarrollo rápido, docs auto |
| JavaScript | `commander.js` | API fluent chain | Herramientas Node.js, middleware |
| JavaScript | `yargs` | Declarativo, validación | CLIs complejos, subcomandos anidados |
| Java | `picocli` | Anotaciones, GraalVM native | Enterprise, compilación native-image |
| Java | `Apache Commons CLI` | Builder pattern | Proyectos Java legacy |

## Mejores Prácticas

- **Proporciona `--help` y `--version`**: Cada CLI debe auto-documentarse. Los usuarios nunca deberían necesitar leer el código fuente para entender el uso.
- **Usa códigos de salida correctamente**: Retorna `0` en éxito, `1` en errores generales, `2` en mal uso y `130` para SIGINT (Ctrl+C). CI/CD depende de esto.
- **Soporta `-` para stdin/stdout**: `cat data.csv | mytool process - > output.json` es la forma Unix. No fuerces archivos temporales.
- **Valida temprano, falla rápido**: Verifica argumentos, existencia de archivos y permisos antes de hacer trabajo real. Imprime mensajes de error claros.
- **Usa variables de entorno para secretos**: API keys y tokens van en `MYTOOL_API_KEY`, no en argumentos `--api-key` que filtran al historial del shell.

## Errores Comunes

- **Mensajes de error pobres**: `Error: invalid argument` no dice nada al usuario. Di `Error: --count debe ser un entero positivo, recibió "abc"`.
- **Sin subcomandos para herramientas complejas**: Una herramienta con 20 flags es más difícil de usar que una con 4 subcomandos de 5 flags cada uno.
- **Rutas y defaults hardcodeados**: Asume que la herramienta corre en CI, Docker y Windows. Usa rutas relativas y overrides por variable de entorno.
- **Ignorar stderr**: Imprime progreso y diagnósticos a `stderr` para que `stdout` permanezca limpio para piping a otras herramientas.
- **Sin validación de entrada**: Aceptar `deploy prod --replicas=-5` crasheará más tarde. Valida rangos, enums y rutas de archivo en tiempo de parseo.

## Preguntas Frecuentes

### Debo usar un framework o parsear argumentos manualmente?

**Siempre usa un framework.** `argparse`, `commander.js` y `picocli` están probados en batalla y manejan edge cases (quotes, escapes, flags desconocidos, formateo de ayuda) que el slicing manual de `process.argv` o `sys.argv` hace mal. La ganancia de productividad supera ampliamente el pequeño costo de dependencia.

### Cómo manejo archivos de configuración junto a argumentos CLI?

Carga un archivo de configuración (JSON, YAML, TOML) como defaults, luego deja que los argumentos CLI sobreescriban valores específicos. El orden de precedencia debería ser: **args CLI > env vars > archivo config > defaults hardcodeados**. Documenta esta jerarquía en tu README.

### Cómo pruebo una herramienta CLI?

En Python, usa `subprocess.run(["python", "cli.py", "--help"])` o testea las funciones puras detrás del CLI directamente. En JavaScript, importa el handler del comando y llámalo con un objeto argv parseado. En Java, testea el método `call()` de tu clase picocli independientemente del punto de entrada `main()`. Mantén la lógica de negocio separada del cableado CLI.
