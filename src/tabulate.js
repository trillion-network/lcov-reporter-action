import { th, tr, td, table, tbody, a, b, span, fragment } from "./html"
import { createHref, normalisePath } from "./util"

// Tabulate the lcov data in a HTML table.
export function tabulate(lcov, options) {
	const head = tr(
		th("File"),
		th("Stmts"),
		th("Branches"),
		th("Funcs"),
		th("Lines"),
		th("Uncovered Lines"),
	)

	const folders = {}
	for (const file of filterAndNormaliseLcov(lcov, options)) {
		const parts = file.file.replace(options.prefix, "").split("/")
		const folder = parts.slice(0, -1).join("/")
		folders[folder] = folders[folder] || []
		folders[folder].push(file)
	}

	const rows = Object.keys(folders)
		.sort()
		.reduce(
			(acc, key) => [
				...acc,
				toFolder(key, options),
				...folders[key].map(file => toRow(file, key !== "", options)),
			],
			[],
		)

	return table(tbody(head, ...rows))
}

function filterAndNormaliseLcov(lcov, options) {
	return lcov
		.map(file => ({
			...file,
			file: normalisePath(file.file),
		}))
		.filter(file => shouldBeIncluded(file.file, options))
}

function shouldBeIncluded(fileName, options) {
	if (!options.shouldFilterChangedFiles) {
		return true
	}
	return options.changedFiles.includes(fileName.replace(options.prefix, ""))
}

function toFolder(path) {
	if (path === "") {
		return ""
	}

	return tr(td({ colspan: 6 }, b(path)))
}

function getStatement(file) {
	const { branches, functions, lines } = file

	return [branches, functions, lines].reduce(
		function(acc, curr) {
			if (!curr) {
				return acc
			}

			return {
				hit: acc.hit + curr.hit,
				found: acc.found + curr.found,
			}
		},
		{ hit: 0, found: 0 },
	)
}

function toRow(file, indent, options) {
	return tr(
		td(filename(file, indent, options)),
		td(percentage(getStatement(file), options)),
		td(percentage(file.branches, options)),
		td(percentage(file.functions, options)),
		td(percentage(file.lines, options)),
		td(uncovered(file, options)),
	)
}

function filename(file, indent, options) {
	const { href, filename } = createHref(options, file)
	const space = indent ? "&nbsp; &nbsp;" : ""
	return fragment(space, a({ href }, filename))
}

function percentage(item) {
	if (!item) {
		return "N/A"
	}

	const value = item.found === 0 ? 100 : (item.hit / item.found) * 100
	const rounded = value.toFixed(2).replace(/\.0*$/, "")

	const tag = value === 100 ? fragment : b

	return tag(`${rounded}%`)
}

function uncovered(file, options) {
	const branches = (file.branches ? file.branches.details : [])
		.filter(branch => branch.taken === 0)
		.map(branch => branch.line)

	const lines = (file.lines ? file.lines.details : [])
		.filter(line => line.hit === 0)
		.map(line => line.line)

	const all = ranges([...branches, ...lines])

	return all
		.map(function(range) {
			const fragment =
				range.start === range.end
					? `L${range.start}`
					: `L${range.start}-L${range.end}`
			const { href } = createHref(options, file)
			const text =
				range.start === range.end
					? range.start
					: `${range.start}&ndash;${range.end}`

			return a({ href: `${href}#${fragment}` }, text)
		})
		.join(", ")
}

function ranges(linenos) {
	const res = []

	let last = null

	linenos.sort().forEach(function(lineno) {
		if (last === null) {
			last = { start: lineno, end: lineno }
			return
		}

		if (last.end + 1 === lineno) {
			last.end = lineno
			return
		}

		res.push(last)
		last = { start: lineno, end: lineno }
	})

	if (last) {
		res.push(last)
	}

	return res
}
