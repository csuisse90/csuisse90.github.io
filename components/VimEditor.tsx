"use client";

import { useEffect, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { markdown } from "@codemirror/lang-markdown";
import { EditorView } from "@codemirror/view";
import { vim, Vim } from "@replit/codemirror-vim";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";

/** The editor `nvim` opens. Vim keys are always on here — that is the point of
 *  the command — and :w, :q, :wq and :q! do what they do everywhere else. */
export default function VimEditor({
  path,
  initial,
  onSave,
  onClose,
}: {
  path: string;
  initial: string;
  onSave: (text: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(initial);
  const [status, setStatus] = useState("");
  const latest = useRef(initial);
  const dirty = useRef(false);

  latest.current = text;

  useEffect(() => {
    // Vim's ex commands are registered globally, so they are defined once and
    // read the current buffer through refs rather than through a closure.
    Vim.defineEx("write", "w", () => {
      onSave(latest.current);
      dirty.current = false;
      setStatus(`"${path}" written`);
    });
    Vim.defineEx("quit", "q", () => {
      if (dirty.current) {
        setStatus("unsaved changes — :wq to save and quit, :q! to discard");
        return;
      }
      onClose();
    });
    Vim.defineEx("wq", "wq", () => {
      onSave(latest.current);
      onClose();
    });
    Vim.defineEx("quitall", "qa", () => onClose());
    Vim.defineEx("xit", "x", () => {
      onSave(latest.current);
      onClose();
    });
  }, [onSave, onClose, path]);

  const language = path.endsWith(".md") ? markdown() : python();

  return (
    <div className="vimOverlay" role="dialog" aria-modal="true" aria-label={`Editing ${path}`}>
      <div className="vimFrame">
        <div className="vimBar">
          <span className="vimName">{path}</span>
          <span className="vimHint">
            :w write · :q quit · :wq both · :q! discard · esc for normal mode
          </span>
        </div>

        <CodeMirror
          value={text}
          height="60vh"
          theme={vscodeDark}
          extensions={[vim(), language, EditorView.lineWrapping]}
          onChange={(v) => {
            setText(v);
            dirty.current = true;
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
          {status || (dirty.current ? "[+] modified" : "")}
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
