const fs = require('fs');

let form = fs.readFileSync('src/modules/projects/ui/components/message-form.tsx', 'utf-8');

// 1. Add isGenerating prop
form = form.replace(
  'extractedFrameCount?: number;\n};',
  'extractedFrameCount?: number;\n  isGenerating?: boolean;\n};'
);

// 2. Add isGenerating to destructuring
form = form.replace(
  'export const MessageForm = ({ projectId, stage = "SITE", extractedZipUrl, extractedFrameCount }: Props) => {',
  'export const MessageForm = ({ projectId, stage = "SITE", extractedZipUrl, extractedFrameCount, isGenerating }: Props) => {'
);

// 3. Add cancelGeneration mutation
form = form.replace(
  'const buildSite = useMutation(trpc.projects.buildSite.mutationOptions({',
  `const cancelGeneration = useMutation(trpc.projects.cancelGeneration.mutationOptions({
    onSuccess: () => {
      toast.success("Generation stopped");
      queryClient.invalidateQueries(trpc.messages.getMany.queryOptions({ projectId, stage }));
    }
  }));

  const buildSite = useMutation(trpc.projects.buildSite.mutationOptions({`
);

// 4. Update isButtonDisabled logic
form = form.replace(
  'const isButtonDisabled = isPending || !form.formState.isValid;',
  'const isButtonDisabled = isPending || (!form.formState.isValid && !isGenerating);'
);

// 5. Update button UI
const oldButton = `              <button
                type="submit"
                disabled={isButtonDisabled}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-white disabled:bg-[#666666] hover:bg-[#cccccc] transition-all shadow-sm active:scale-95"
              >
                {isPending ? (
                  <i className="ri-loader-4-line animate-spin inline-block" />
                ) : (
                  <i className="ri-arrow-up-line text-[#1C1C1C]" />
                )}
              </button>`;

const newButton = `              {isGenerating ? (
                <button
                  type="button"
                  onClick={() => cancelGeneration.mutate({ projectId })}
                  disabled={cancelGeneration.isPending}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition-all shadow-sm active:scale-95"
                >
                  <i className={cancelGeneration.isPending ? "ri-loader-4-line animate-spin" : "ri-stop-fill"} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isButtonDisabled}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-[#1C1C1C] disabled:bg-[#666666] disabled:text-[#444] hover:bg-[#cccccc] transition-all shadow-sm active:scale-95"
                >
                  {isPending ? (
                    <i className="ri-loader-4-line animate-spin inline-block" />
                  ) : (
                    <i className="ri-arrow-up-line" />
                  )}
                </button>
              )}`;

form = form.replace(oldButton, newButton);

fs.writeFileSync('src/modules/projects/ui/components/message-form.tsx', form);
