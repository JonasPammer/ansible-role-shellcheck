# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Ansible role for installing ShellCheck, a static analysis tool for shell scripts. The role is part of a collection maintained by Jonas Pammer and follows standardized patterns from a CookieCutter template.

**Key characteristics:**
- Supports multiple installation methods (GitHub releases, system package manager, source compilation)
- Tested across multiple Linux distributions (Rocky, Fedora, Debian, Ubuntu)
- Tested with Ansible versions 2.13-2.16 (Ansible 6-9)
- Follows conventional commits and extensive pre-commit hooks
- Uses Molecule with Docker for integration testing

## Essential Development Commands

### Testing
```bash
# Run all tests (linting + molecule testing across all Ansible versions)
tox

# Test with a specific distribution
MOLECULE_DISTRO=ubuntu2204 tox
MOLECULE_DISTRO=debian12 tox
MOLECULE_DISTRO=rockylinux9 tox
MOLECULE_DISTRO=fedora39 tox

# Test with a specific Ansible version
tox -e py3-ansible-6  # Ansible 2.13
tox -e py3-ansible-7  # Ansible 2.14
tox -e py3-ansible-8  # Ansible 2.15
tox -e py3-ansible-9  # Ansible 2.16

# Run specific distribution + Ansible version
MOLECULE_DISTRO=ubuntu2204 tox -e py3-ansible-9

# Display installed package versions (useful for debugging)
CI=true tox
```

### Linting
```bash
# Run all pre-commit hooks
pre-commit run --all-files

# Run only specific hooks
tox -e pre-commit

# YAML linting
yamllint .

# Ansible linting (runs as part of molecule test)
ansible-lint
```

### Debugging Molecule Tests
```bash
# Keep container alive after test failure
MOLECULE_DESTROY=never MOLECULE_DISTRO=ubuntu2204 tox -e py3-ansible-9

# Find running container
docker ps

# Access the container
docker exec -it <container_id> /bin/bash

# Debug files are available at:
# - /var/tmp/vars.yml (host variables)
# - /var/tmp/environment.yml

# Clean up after debugging
docker stop <container_id>
docker container rm <container_id>
# or
docker container prune
```

### Setup
```bash
# Create virtual environment and install dependencies
python3 -m venv venv
source venv/bin/activate
pip install -r requirements-dev.txt

# Install pre-commit hooks locally
pre-commit install
```

## Architecture & Code Structure

### Installation Methods (tasks/)

The role supports three installation strategies selected via `shellcheck_install_method`:

1. **release** (default) - `tasks/install-from-release.yml`
   - Downloads pre-compiled binary from GitHub releases
   - Architecture detection based on `ansible_architecture`
   - Extracts to `/usr/local/bin/shellcheck`
   - Supports checksum verification

2. **system** - `tasks/install-from-system.yml`
   - Uses native package manager (apt, yum, dnf)
   - Package name resolution via `shellcheck_system_package_name`

3. **source** - `tasks/install-from-source.yml`
   - NOT IMPLEMENTED YET
   - Placeholder for future source compilation

### Task Flow
```
tasks/main.yml
├── import_tasks: assert.yml          # Variable validation (run_once, delegate to localhost)
└── include_tasks: install-from-*.yml # Dynamic inclusion based on shellcheck_install_method
```

### Variable Resolution Pattern

The role uses a sophisticated fallback pattern for distribution-specific values:
```yaml
variable_name: "{{
  _internal_var[ansible_distribution ~ '_' ~ ansible_distribution_major_version]|default(
  _internal_var[ansible_os_family ~ '_' ~ ansible_distribution_major_version])|default(
  _internal_var[ansible_distribution])|default(
  _internal_var[ansible_os_family])|default(
  _internal_var['default']) }}"
```

This allows role variables to adapt to specific distributions while providing sensible defaults.

### Testing Structure (molecule/)

Two test scenarios exist:

- **default/** - Standard test scenario
  - `molecule.yml`: Docker-based testing configuration
  - `converge.yml`: Applies the role with default settings
  - `verify.yml`: Validates shellcheck installation

- **definitive_version/** - Tests specific version installation
  - Tests installation of pinned versions with checksum verification

- **resources/** - Shared across scenarios
  - `prepare.yml`: Sets up test hosts with dependencies
  - `debug.yml`: Outputs diagnostic information (saved to `/var/tmp/*.yml`)

### CI/CD Architecture

**GitHub Workflows:**
- `.github/workflows/ci.yml` - Matrix testing (7 distributions × 4 Ansible versions)
- `.github/workflows/release-to-galaxy.yml` - Automatic Galaxy publishing on tag push
- `.github/workflows/gh-pages.yml` - Documentation generation (README.adoc → README.md)
- `.github/workflows/label-pr-sizes.yml` - Automatic PR size labeling
- `.github/workflows/issue-label-manager.yml` - Issue labeling automation

**Quality Gates:**
- pre-commit.ci automatically runs and fixes code on PRs
- Matrix testing ensures cross-platform compatibility
- ansible-lint enforces best practices

### CookieCutter Template Sync

This project is templated from https://github.com/JonasPammer/cookiecutter-ansible-role and kept in sync using `cruft`:

```bash
cruft check  # Check if template has updates
cruft update # Apply template updates
```

**Important:** Changes applicable to the template should be made there, not here.

## Development Workflow

### Making Changes

1. Changes to role defaults must be documented in both:
   - `defaults/main.yml`
   - `README.adoc` (under Role Variables section)

2. All commits must follow conventional commits (for core contributors):
   - `feat:` - New features
   - `fix:` - Bug fixes
   - `chore:` - Maintenance tasks
   - `docs:` - Documentation updates

3. README.md is auto-generated from README.adoc - never edit it directly

### Versioning & Releases

- Versions are Git tags (must NOT start with 'v')
- Pushing a tag triggers automatic Ansible Galaxy release
- Human-readable changelogs are manually created as GitHub Releases

### Pre-commit Hooks

The following hooks run automatically (configured in `.pre-commit-config.yaml`):
- commitlint (conventional commits)
- prettier (markdown/JSON/YAML formatting)
- yamllint (YAML syntax)
- detect-secrets (credential scanning)
- Python: black, flake8, mypy, pyupgrade, reorder-python-imports

## Role-Specific Patterns

### When modifying task files:

- Use fully qualified collection names (FQCN): `ansible.builtin.copy` not `copy`
- Mark tasks that don't change state: `changed_when: false`
- Use `become: true` only when necessary (installation tasks need it)
- Validate variables in `tasks/assert.yml` before use

### When adding variables:

- Public variables go in `defaults/main.yml` (user-overridable)
- Internal variables go in `vars/main.yml` (non-overridable, prefixed with `_rolename__`)
- Registered facts use prefix `rolename__register_fact_*`

### When adding supported distributions:

1. Update `meta/main.yml` with platform/version
2. Add to CI matrix in `.github/workflows/ci.yml`
3. Test with corresponding geerlingguy Docker image
4. Update system package name mapping if needed

## Testing Philosophy

- Tests run in Docker containers using geerlingguy's ansible-enabled images
- Each test scenario validates actual shellcheck installation and execution
- Molecule scenarios are scenario-independent (can run in parallel)
- Debug output is captured to `/var/tmp/` and uploaded as CI artifacts
- On CI failure, tmate debugging session available for manual workflow runs
