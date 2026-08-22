---
contentType: recipes
slug: cli-tool-argument-parsing
title: "Parseo de argumentos CLI en Python, JS, Java, Go y Rust"
description: "Construí herramientas de línea de comandos que manejen flags, argumentos posicionales, subcomandos y validación en Python, JS, Java, Go y Rust."
metaDescription: "Construí herramientas CLI en Python, JavaScript, Java, Go y Rust. Cubre argparse, commander.js, picocli, cobra, clap, subcomandos y validación."
difficulty: intermediate
topics:
  - devops
tags:
  - cli
  - command-line
  - argparse
  - commander.js
  - picocli
  - cobra
  - clap
  - devops
  - automation
relatedResources:
  - /recipes/background-jobs
  - /recipes/environment-variables
  - /recipes/cron-jobs
  - /recipes/health-check-endpoint
  - /recipes/feature-flags
  - /recipes/parse-config-files
lastUpdated: "2026-08-22"
publishedAt: "2026-06-11"
author: Mathias Paulenko
seo:
  metaDescription: "Construí herramientas CLI en Python, JavaScript, Java, Go y Rust. Cubre argparse, commander.js, picocli, cobra, clap, subcomandos y validación."
  keywords:
    - cli
    - command-line
    - argparse
    - argument-parsing
    - flags
    - subcomandos
    - python
    - javascript
    - java
    - go
    - rust
---

Las herramientas de línea de comandos siguen corriendo la mayoría de flujos de desarrollo,
automatización DevOps y pipelines de procesamiento de datos. Una buena CLI te da subcomandos claros,
defaults razonables, errores útiles y ayuda que se genera sola.

A continuación hay ejemplos concretos del mismo CLI `deploy` en Python, JavaScript, Java, Go y Rust,
usando las librerías que los equipos usan en la práctica.

## Cuándo Usarlo

- Estás construyendo herramientas internas, scripts de deploy o utilidades de automatización.
- Necesitás un pipeline de procesamiento o ETL que corra desde el terminal.
- Querés exponer funcionalidad de la app a sysadmins o pipelines de CI/CD.
- Tu script tiene más que un par de argumentos, así que un parser lo mantiene manejable.

## Cuándo NO Usarlo

- El script es de una sola vez con una o dos flags; los argumentos de shell pueden alcanzar.
- Una web UI o dashboard le resultaría más fácil al usuario final.
- La herramienta depende de prompts interactivos en entornos sin TTY.

## Solución

### Python (argparse)

```python
import argparse

def main():
    parser = argparse.ArgumentParser(description="Deploy CLI tool")
    parser.add_argument("environment", choices=["dev", "staging", "prod"],
                        help="Target environment")
    parser.add_argument("--version", default="latest",
                        help="App version to deploy")
    parser.add_argument("--dry-run", action="store_true",
                        help="Simulate without changes")
    parser.add_argument("-v", "--verbose", action="store_true",
                        help="Enable verbose output")

    args = parser.parse_args()
    print(f"Deploying {args.version} to {args.environment}")
    if args.dry_run:
        print("(dry run mode)")

if __name__ == "__main__":
    main()
```

### Python (Typer)

```python
import typer

app = typer.Typer()

@app.command()
def deploy(environment: str, version: str = "latest",
           dry_run: bool = False, verbose: bool = False):
    typer.echo(f"Deploying {version} to {environment}")
    if dry_run:
        typer.echo("(dry run mode)")

if __name__ == "__main__":
    app()
```

### JavaScript (commander.js)

```javascript
const { Command } = require("commander");
const program = new Command();

program.name("deploy-cli").description("CLI for app deployments").version("1.0.0");

program
  .command("deploy <environment>")
  .description("Deploy to an environment")
  .option("-v, --version <ver>", "App version", "latest")
  .option("--dry-run", "Simulate without changes", false)
  .option("--verbose", "Verbose output", false)
  .action((environment, options) => {
    console.log(`Deploying ${options.version} to ${environment}`);
    if (options.dryRun) console.log("(dry run mode)");
  });

program.parse();
```

### JavaScript (yargs)

```javascript
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");

yargs(hideBin(process.argv))
  .command("deploy <env>", "Deploy to environment", (yargs) => {
    return yargs
      .positional("env", { describe: "Target environment",
                           choices: ["dev", "staging", "prod"] })
      .option("version", { alias: "v", default: "latest" })
      .option("dry-run", { type: "boolean", default: false });
  }, (argv) => {
    console.log(`Deploying ${argv.version} to ${argv.env}`);
  })
  .demandCommand(1, "You need at least one command")
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

@Command(name = "deploy-cli",
         description = "CLI for app deployments",
         version = "1.0.0",
         mixinStandardHelpOptions = true)
public class DeployCli implements Callable<Integer> {

    @Parameters(index = "0", description = "Target environment")
    private String environment;

    @Option(names = {"-v", "--version"}, defaultValue = "latest",
            description = "App version")
    private String version;

    @Option(names = "--dry-run", description = "Simulate without changes")
    private boolean dryRun;

    @Option(names = {"-V", "--verbose"}, description = "Verbose output")
    private boolean verbose;

    @Override
    public Integer call() {
        System.out.printf("Deploying %s to %s%n", version, environment);
        if (dryRun) System.out.println("(dry run mode)");
        return 0;
    }

    public static void main(String[] args) {
        int exitCode = new CommandLine(new DeployCli()).execute(args);
        System.exit(exitCode);
    }
}
```

### Go (cobra)

```go
package main

import (
    "fmt"
    "os"
    "github.com/spf13/cobra"
)

var (
    version string
    dryRun  bool
    verbose bool
)

func main() {
    rootCmd := &cobra.Command{
        Use:     "deploy-cli",
        Short:   "CLI for app deployments",
        Version: "1.0.0",
    }

    deployCmd := &cobra.Command{
        Use:   "deploy [environment]",
        Short: "Deploy to an environment",
        Args:  cobra.ExactArgs(1),
        Run: func(cmd *cobra.Command, args []string) {
            env := args[0]
            fmt.Printf("Deploying %s to %s\n", version, env)
            if dryRun {
                fmt.Println("(dry run mode)")
            }
        },
    }

    deployCmd.Flags().StringVarP(&version, "version", "v", "latest", "App version")
    deployCmd.Flags().BoolVar(&dryRun, "dry-run", false, "Simulate without changes")
    deployCmd.Flags().BoolVarP(&verbose, "verbose", "V", false, "Verbose output")

    rootCmd.AddCommand(deployCmd)
    if err := rootCmd.Execute(); err != nil {
        os.Exit(1)
    }
}
```

### Rust (clap)

```rust
use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(name = "deploy-cli", version = "1.0.0",
          about = "CLI for app deployments")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Deploy to an environment
    Deploy {
        /// Target environment
        #[arg(value_enum)]
        environment: Environment,

        /// App version
        #[arg(short, long, default_value = "latest")]
        version: String,

        /// Simulate without changes
        #[arg(long)]
        dry_run: bool,
    },
}

#[derive(clap::ValueEnum, Clone)]
enum Environment {
    Dev,
    Staging,
    Prod,
}

fn main() {
    let cli = Cli::parse();
    match cli.command {
        Commands::Deploy { environment, version, dry_run } => {
            println!("Deploying {} to {:?}", version, environment);
            if dry_run {
                println!("(dry run mode)");
            }
        }
    }
}
```

## Explicación

Un framework de CLI se encarga de lo aburrido para que te concentres en la lógica de la herramienta:

- **Parsing** separa `deploy prod --version 2.1.0 --dry-run` en un objeto estructurado.
- **Validación** rechaza choices inválidos, fuerza flags requeridos y chequea tipos.
- **Generación de ayuda** construye `--help` a partir de las definiciones.
- **Subcomandos** organizan herramientas complejas (`git push`, `git pull`, `git log`).
- **Códigos de salida** devuelven `0` en éxito y distinto de cero en error, para que CI/CD y scripts
    de shell reaccionen.

## Variantes

| Lenguaje | Librería | Estilo | Ideal para |
| --- | --- | --- | --- |
| Python | `argparse` | Stdlib, imperativo | Sin dependencias, scripts simples |
| Python | `typer` | Type hints, moderno | Desarrollo rápido, docs automáticas |
| JavaScript | `commander.js` | Cadena fluida | CLI Node.js, middleware |
| JavaScript | `yargs` | Declarativo, validación | CLIs complejos, subcomandos anidados |
| Java | `picocli` | Anotaciones, GraalVM | Enterprise, imágenes nativas |
| Go | `cobra` | Estilo stdlib, subcomandos | CLIs Go, shell completion |
| Rust | `clap` | Macros derive | Type-safe, binarios rápidos |

## Buenas Prácticas

- Proveé `--help` y `--version` para que los usuarios no necesiten leer el código fuente.
- Devolvé códigos de salida correctos: `0` éxito, `1` error general, `2` mal uso, `130` para SIGINT.
- Soportá `-` para stdin/stdout: `cat data.csv | mytool process - > output.json`.
- Validá temprano y fallá rápido; imprimir un mensaje claro con lo esperado y lo recibido.
- Mantené secretos en variables de entorno, no en argumentos `--api-key`.

## Errores Comunes

- Imprimir `Error: invalid argument` sin contexto. Decí qué se esperaba y qué llegó.
- Hacer una herramienta con 20 flags en vez de varios subcomandos.
- Hardcodear rutas y asumir el entorno de desarrollo local.
- Enviar progreso y diagnósticos a `stdout` en lugar de `stderr`.
- Permitir valores inválidos como `--replicas=-5` y que lleguen a la lógica de la app.

## Preguntas Frecuentes

### ¿Uso un framework o parseo a mano?

Usá un framework. `argparse`, `commander.js`, `picocli`, `cobra` y `clap` manejan comillas, escapes,
flags desconocidos y formateo de ayuda. El tiempo que ahorrás supera con creces el costo de la
dependencia.

### ¿Cómo combino archivos de configuración con argumentos CLI?

Cargá un archivo de configuración como default y dejá que los argumentos de CLI sobrescriban valores
específicos. El orden de precedencia es: **args CLI > vars de entorno > archivo de config > defaults
hardcodeados**.

### ¿Cómo testeo una herramienta CLI?

Mantené la lógica de negocio separada del cableado de la CLI. Testeá las funciones core
directamente, luego agregá algunos tests de integración que corran el binario con `subprocess`. En
Java, testeá el método `call()` de la clase picocli; en Rust, la lógica del match de `Commands`.

### ¿Cómo distribuyo mi herramienta CLI?

- **Python**: `pip` o `pipx` vía PyPI.
- **JavaScript**: `npm install -g` o `npx`.
- **Go**: binario único vía `go install` o GitHub Releases.
- **Rust**: `cargo install` vía crates.io.
- **Java**: imagen nativa de GraalVM o JAR.
