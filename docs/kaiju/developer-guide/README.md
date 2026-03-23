## Backend

**Step 1.** Install Cobra CLI. 
```bash
go install github.com/spf13/cobra-cli@latest
```

**Step 2.** Create a Cobra CLI configuration file. First, run the command below. 
```bash
vim ~/.cobra.yaml
```

Then, add the following content to it. 
```bash
author: Vic Fernandez III <@cyberphor>
license: MIT
```

**Step 2.** Make a directory. 
```bash
mkdir kaiju
```

**Step 3.** Initialize a new Go module.
```bash
go mod init github.com/deathlabs/kaiju
```

**Step 4.** Initialize your Go module to use the Cobra CLI.
```bash
cobra-cli init 
```

**Step 5.** Add a subcommand to the backend using the Cobra CLI.
```bash
cobra-cli add serve
```