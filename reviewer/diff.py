import re


def get_changed_lines(patch: str):

    lines = []

    current_line = None

    for line in patch.splitlines():

        if line.startswith("@@"):

            match = re.search(
                r"\+(\d+)",
                line
            )

            if match:
                current_line = int(
                    match.group(1)
                )

            continue

        if line.startswith("+"):

            if not line.startswith("+++"):

                lines.append({
                    "line": current_line,
                    "content": line[1:],
                })

                current_line += 1

        elif not line.startswith("-"):

            if current_line is not None:
                current_line += 1

    return lines