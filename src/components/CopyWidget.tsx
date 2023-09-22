import { useState } from "react";

export function CopyWidget(
  props: {
    text: string;
  } & React.HTMLAttributes<HTMLDivElement>,
) {
  const { text, ...restProps } = props;
  const [copied, setCopied] = useState(false);
  return (
    <div {...restProps}>
      <div className="input-group">
        <input type="text" className="form-control" value={text} readOnly />
        <button
          className="btn btn-outline-secondary"
          type="button"
          onClick={() => {
            window.navigator.clipboard.writeText(text);
            setCopied(true);
          }}
        >
          {copied ? (
            <i className="fa fa-check ms-1"></i>
          ) : (
            <i className="fa fa-copy"></i>
          )}
        </button>
      </div>
    </div>
  );
}
