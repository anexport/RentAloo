import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

const PageHeader = ({ title, description, action, className }: PageHeaderProps) => {
  return (
    <div className={cn("mb-6", className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h1 className="text-headline-lg font-bold text-foreground mb-2">
            {title}
          </h1>
          {description && (
            <p className="text-body-md text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {action && (
          <div className="ml-4 flex-shrink-0">
            {action}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageHeader;

