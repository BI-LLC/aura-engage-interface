import os
import re
import sys
import ast
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]


AI_TERMS = [
    r"\bai\b",
    r"\ballm\b",
    r"\bgpt(?:-\d+|)\b",
    r"\bopenai\b",
    r"\banthropic\b",
    r"\bclaude\b",
    r"\bgrok\b",
    r"\bllama\b",
    r"\bchatgpt\b",
]

AI_TERMS_REGEX = re.compile("|".join(AI_TERMS), re.IGNORECASE)

FILE_EXTENSIONS = {".py", ".ts", ".tsx", ".js"}

IGNORE_DIRS = {
    "venv",
    "node_modules",
    "dist",
    "build",
    "__pycache__",
    ".git",
}


def is_source_file(path: Path) -> bool:
    return path.suffix in FILE_EXTENSIONS


def strip_inline_python_comment_if_ai(line: str) -> str:
    in_single = False
    in_double = False
    escape = False
    for idx, ch in enumerate(line):
        if ch == "\\" and not escape:
            escape = True
            continue
        if ch == "'" and not in_double and not escape:
            in_single = not in_single
        elif ch == '"' and not in_single and not escape:
            in_double = not in_double
        elif ch == "#" and not in_single and not in_double:
            comment_text = line[idx + 1 :]
            if AI_TERMS_REGEX.search(comment_text):
                return line[:idx].rstrip() + ("\n" if line.endswith("\n") else "")
            else:
                return line
        escape = False
    return line


def remove_ai_comments_from_python(content: str) -> str:
    lines = content.splitlines(keepends=True)
    cleaned = []
    for line in lines:
        stripped = line.lstrip()
        if stripped.startswith("#") and AI_TERMS_REGEX.search(stripped):
            continue
        line = strip_inline_python_comment_if_ai(line)
        cleaned.append(line)
    text = "".join(cleaned)
    # Collapse excessive blank lines
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text


BLOCK_COMMENT_RE = re.compile(r"/\*[\s\S]*?\*/")


def remove_ai_comments_from_ts_js(content: str) -> str:
    # Remove AI-related block comments entirely
    def _block_replacer(match: re.Match) -> str:
        block = match.group(0)
        return "" if AI_TERMS_REGEX.search(block) else block

    content = re.sub(BLOCK_COMMENT_RE, _block_replacer, content)

    # Remove AI-related single-line comments
    cleaned_lines = []
    for line in content.splitlines(keepends=True):
        if re.search(r"(^|\s)//", line):
            # Split on first // not inside string (simple heuristic)
            # This can have false positives, but is acceptable for comments
            idx = line.find("//")
            if idx != -1:
                comment_text = line[idx + 2 :]
                if AI_TERMS_REGEX.search(comment_text):
                    line = line[:idx].rstrip() + ("\n" if line.endswith("\n") else "")
        cleaned_lines.append(line)
    text = "".join(cleaned_lines)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text


def ensure_module_header(path: Path, content: str) -> str:
    # Add a concise, human-friendly header if the file has no leading comment header
    header_line = None
    rel = path.relative_to(REPO_ROOT).as_posix()
    if path.suffix == ".py":
        header_line = f"# {rel}: Utility module for the application.\n"
        comment_prefix = "#"
    else:
        header_line = f"// {rel}: UI or service logic for the application.\n"
        comment_prefix = "//"

    # Check first 5 non-empty, non-encoding lines for an existing comment header
    lines = content.splitlines(keepends=True)
    non_empty_seen = 0
    has_header = False
    for raw in lines[:8]:
        s = raw.strip()
        if not s:
            continue
        non_empty_seen += 1
        if s.startswith(comment_prefix):
            has_header = True
            break
        if non_empty_seen >= 3:
            break

    if not has_header:
        return header_line + ("\n" if not content.startswith("\n") else "") + content
    return content


def process_file(path: Path) -> bool:
    try:
        original = path.read_text(encoding="utf-8")
    except Exception:
        return False

    updated = original
    if path.suffix == ".py":
        updated = remove_ai_comments_from_python(updated)
    else:
        updated = remove_ai_comments_from_ts_js(updated)

    updated = ensure_module_header(path, updated)

    if updated != original:
        path.write_text(updated, encoding="utf-8")
        return True
    return False


def walk_source_files(root: Path):
    for dirpath, dirnames, filenames in os.walk(root):
        # Prune ignored directories in-place for os.walk efficiency
        dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]
        for filename in filenames:
            p = Path(dirpath) / filename
            if is_source_file(p):
                yield p


def index_python_symbols(path: Path):
    try:
        source = path.read_text(encoding="utf-8")
        tree = ast.parse(source)
    except Exception:
        return {"functions": [], "classes": {}}

    functions = []
    classes = {}
    for node in tree.body:
        if isinstance(node, ast.FunctionDef):
            functions.append(node.name)
        elif isinstance(node, ast.AsyncFunctionDef):
            functions.append(node.name)
        elif isinstance(node, ast.ClassDef):
            method_names = []
            for item in node.body:
                if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    method_names.append(item.name)
            classes[node.name] = method_names
    return {"functions": sorted(set(functions)), "classes": classes}


TS_FUNC_RE = re.compile(r"\bfunction\s+([A-Za-z0-9_]+)\s*\(")
TS_EXPORT_FUNC_RE = re.compile(r"\bexport\s+function\s+([A-Za-z0-9_]+)\s*\(")
TS_CLASS_RE = re.compile(r"\bclass\s+([A-Za-z0-9_]+)\b")
TS_EXPORT_CLASS_RE = re.compile(r"\bexport\s+class\s+([A-Za-z0-9_]+)\b")


def index_ts_js_symbols(path: Path):
    try:
        source = path.read_text(encoding="utf-8")
    except Exception:
        return {"functions": [], "classes": []}

    funcs = set(re.findall(TS_FUNC_RE, source) + re.findall(TS_EXPORT_FUNC_RE, source))
    classes = set(re.findall(TS_CLASS_RE, source) + re.findall(TS_EXPORT_CLASS_RE, source))
    return {"functions": sorted(funcs), "classes": sorted(classes)}


def generate_code_index(files: list[Path]) -> str:
    lines = ["# Code Index\n\n"]
    for path in sorted(files, key=lambda p: p.as_posix()):
        rel = path.relative_to(REPO_ROOT).as_posix()
        lines.append(f"- {rel}\n")
        if path.suffix == ".py":
            sym = index_python_symbols(path)
            if sym["classes"]:
                for cls, methods in sym["classes"].items():
                    lines.append(f"  - class {cls} ({len(methods)} methods)\n")
            if sym["functions"]:
                lines.append(f"  - functions: {', '.join(sym['functions'])}\n")
        else:
            sym = index_ts_js_symbols(path)
            if sym["classes"]:
                lines.append(f"  - classes: {', '.join(sym['classes'])}\n")
            if sym["functions"]:
                lines.append(f"  - functions: {', '.join(sym['functions'])}\n")
    return "".join(lines)


def main():
    root = REPO_ROOT
    changed_files = 0
    source_files = list(walk_source_files(root))
    for path in source_files:
        if process_file(path):
            changed_files += 1

    index_text = generate_code_index(source_files)
    (root / "CODE_INDEX.md").write_text(index_text, encoding="utf-8")

    print(f"Processed {len(source_files)} source files. Updated {changed_files} files.")
    print(f"Index written to {root / 'CODE_INDEX.md'}")


if __name__ == "__main__":
    sys.exit(main())



