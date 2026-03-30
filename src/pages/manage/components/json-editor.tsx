import { useEffect, useRef } from 'react';
import {
  createJSONEditor,
  type JSONEditorPropsOptional,
  Mode,
} from 'vanilla-jsoneditor';

export default function JsonEditor({
  className,
  ...props
}: JSONEditorPropsOptional & { className?: string }) {
  const refContainer = useRef<HTMLDivElement>(null);
  const refEditor = useRef<ReturnType<typeof createJSONEditor>>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: create the editor only once
  useEffect(() => {
    // create editor
    refEditor.current = createJSONEditor({
      target: refContainer.current!,
      props: {
        mode: Mode.text,
        ...props,
      },
    });

    return () => {
      if (refEditor.current) {
        refEditor.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    refEditor.current?.updateProps(props);
    // biome-ignore lint/correctness/useExhaustiveDependencies: update editor props when the prop bag changes
  }, [props]);

  return <div className={className} ref={refContainer} />;
}
