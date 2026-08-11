"use client";

import { useEffect, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { markdown } from "@codemirror/lang-markdown";
import { EditorView } from "@codemirror/view";
import { vim, Vim } from "@replit/codemirror-vim";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";

/** What the editor may do to the disk. The buffer commands below are the only
 *  part of vim CodeMirror cannot supply on its own, because it has no idea
 *  there is a filesystem behind the buffer. */
export type Files = {
  resolve: (path: string) => string;
  exists: (path: string) => boolean;
  read: (path: string) => string;
  write: (path: string, text: string) => void;
};

/** The editor `nvim` opens. Vim keys are always on. */
export default function VimEditor({
  path,
  initial,
  files,
  onSave,
  onClose,
}: {
  path: string;
  initial: string;
  files: Files;
  /** Called after any write, so the host can flush the disk. */
  onSave: () => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(initial);
  const [name, setName] = useState(path);
  const [status, setStatus] = useState("");
  const [dirty, setDirty] = useState(false);

  // Ex commands are registered once, globally, so they read the live buffer
  // through refs rather than through a stale closure.
  const latest = useRef(initial);
  const current = useRef(path);
  const modified = useRef(false);
  const view = useRef<EditorView | null>(null);
  latest.current = text;
  current.current = name;
  modified.current = dirty;

  useEffect(() => {
    // `:w!` and `:e!` arrive with the bang as the first argument, which is not
    // a filename.
    const target = (params?: { args?: string[] }) =>
      (params?.args ?? []).filter((a) => a !== "!")[0];
    const bang = (params?: { argString?: string }) => (params?.argString ?? "").includes("!");

    const put = (next: string, from: string) => {
      setText(next);
      setName(from);
      setDirty(false);
    };

    const save = (to_?: string) => {
      const to = files.resolve(to_ || current.current);
      files.write(to, latest.current);
      onSave();
      setDirty(false);
      setStatus(`"${to}" ${latest.current.split("\n").length}L written`);
      return to;
    };

    const leave = (force: boolean) => {
      if (modified.current && !force) {
        setStatus("E37: no write since last change — :wq to save, :q! to discard");
        return;
      }
      onClose();
    };

    // Writing and quitting.
    Vim.defineEx("write", "w", (_cm: unknown, params: { args?: string[] }) =>
      save(target(params)),
    );
    Vim.defineEx("wall", "wa", () => save());
    Vim.defineEx("wq", "wq", (_cm: unknown, params: { args?: string[] }) => {
      save(target(params));
      onClose();
    });
    Vim.defineEx("wqall", "wqa", () => {
      save();
      onClose();
    });
    Vim.defineEx("xit", "x", () => {
      if (modified.current) save();
      onClose();
    });
    Vim.defineEx("quit", "q", (_cm: unknown, params: { argString?: string }) =>
      leave(bang(params)),
    );
    // The short form must be a prefix of the full name or defineEx throws — and
    // a throw in here took the entire page down with it.
    Vim.defineEx("qall", "qa", (_cm: unknown, params: { argString?: string }) =>
      leave(bang(params)),
    );

    // Moving between files.
    Vim.defineEx("edit", "e", (_cm: unknown, params: { args?: string[]; argString?: string }) => {
      const wanted = target(params);
      if (modified.current && !bang(params)) {
        setStatus("E37: no write since last change — :e! to discard it");
        return;
      }
      const to = files.resolve(wanted || current.current);
      if (!wanted) {
        put(files.read(to), to);
        setStatus(`"${to}" reloaded`);
        return;
      }
      put(files.exists(to) ? files.read(to) : "", to);
      setStatus(files.exists(to) ? `"${to}"` : `"${to}" [new file]`);
    });
    Vim.defineEx("saveas", "sav", (_cm: unknown, params: { args?: string[] }) => {
      const wanted = target(params);
      if (!wanted) return setStatus("E471: :saveas needs a filename");
      setName(save(wanted));
    });
    Vim.defineEx("read", "r", (_cm: unknown, params: { args?: string[] }) => {
      const wanted = target(params);
      const from = wanted ? files.resolve(wanted) : "";
      if (!from || !files.exists(from)) return setStatus(`E484: cannot open ${wanted ?? ""}`);
      const editor = view.current;
      if (!editor) return;
      const line = editor.state.doc.lineAt(editor.state.selection.main.head);
      editor.dispatch({ changes: { from: line.to, insert: `\n${files.read(from)}` } });
      setStatus(`"${from}" read`);
    });
    Vim.defineEx("file", "f", () =>
      setStatus(`"${current.current}" ${latest.current.split("\n").length} lines${modified.current ? " [+]" : ""}`),
    );
    Vim.defineEx("help", "h", () =>
      setStatus("motions, operators, registers, macros, marks, :s, :g, :sort, :set all work"),
    );
  }, [files, onSave, onClose]);

  const language = name.endsWith(".md") ? markdown() : python();

  return (
    <div className="vimOverlay" role="dialog" aria-modal="true" aria-label={`Editing ${name}`}>
      <div className="vimFrame">
        <div className="vimBar">
          <span className="vimName">{name}</span>
          <span className="vimHint">
            :w write · :q quit · :wq both · :q! discard · :e file · :s/a/b/g · :help
          </span>
        </div>

        <CodeMirror
          value={text}
          height="60vh"
          theme={vscodeDark}
          extensions={[vim(), language, EditorView.lineWrapping]}
          onCreateEditor={(v) => (view.current = v)}
          onChange={(v) => {
            setText(v);
            setDirty(true);
            setStatus("");
          }}
          basicSetup={{
            lineNumbers: true,
            foldGutter: false,
            highlightActiveLine: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            indentOnInput: true,
            tabSize: 4,
          }}
          autoFocus
        />

        <div className="vimStatusLine">
          {status || (dirty ? "[+] modified" : "")}
          <button
            className="vimForce"
            onClick={() => onClose()}
            title="Discard and close, the same as :q!"
          >
            :q!
          </button>
        </div>
      </div>
    </div>
  );
}
