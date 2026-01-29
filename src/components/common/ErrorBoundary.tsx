import { Component, ReactNode } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from './Button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            
            <h1 className="text-xl font-semibold text-zinc-100 mb-2">
              Something went wrong
            </h1>
            
            <p className="text-zinc-400 mb-6">
              An unexpected error occurred. Please try again.
            </p>

            {this.state.error && (
              <div className="mb-6 p-3 bg-zinc-800/50 rounded-lg text-left">
                <p className="text-xs font-mono text-zinc-500 break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <Button onClick={this.handleRetry}>
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
