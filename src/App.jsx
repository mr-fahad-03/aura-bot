import { useState, useRef, useEffect } from 'react'
import { Search, Send, Image, Camera, X, MessageSquare, Sparkles, Clock, Menu, User, ChevronDown, ExternalLink, ThumbsUp, ThumbsDown, Copy, Share } from 'lucide-react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

const API_KEY = import.meta.env.VITE_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`

function App() {
  const [query, setQuery] = useState("")
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("discover")
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const [showCamera, setShowCamera] = useState(false)
  const [stream, setStream] = useState(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [fullText, setFullText] = useState("")
  const [autoScroll, setAutoScroll] = useState(true)
  const contentRef = useRef(null)
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)

  // Detect when user scrolls manually
  useEffect(() => {
    const handleScroll = () => {
      if (contentRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = contentRef.current
        // If user scrolls up more than 100px from bottom, disable auto-scroll
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
        setAutoScroll(isNearBottom)
      }
    }

    const contentElement = contentRef.current
    if (contentElement) {
      contentElement.addEventListener('scroll', handleScroll)
      return () => contentElement.removeEventListener('scroll', handleScroll)
    }
  }, [])

  // Handle scrolling when new content is added
  useEffect(() => {
    if (shouldScrollToBottom && autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
      setShouldScrollToBottom(false)
    }
  }, [shouldScrollToBottom, autoScroll, messages])

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("File too large. Please upload an image smaller than 5MB.")
        return
      }

      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const openCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true })
      setStream(mediaStream)
      setShowCamera(true)
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (error) {
      console.error('Error accessing camera:', error)
      alert('Unable to access camera. Please make sure you have granted camera permissions.')
    }
  }

  const closeCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setShowCamera(false)
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      // Draw the current video frame on the canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      
      // Convert canvas to data URL
      const imageData = canvas.toDataURL('image/jpeg')
      setImagePreview(imageData)
      
      // Create a file object from the data URL
      fetch(imageData)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], "camera-photo.jpg", { type: "image/jpeg" })
          setImageFile(file)
        })
      
      // Close camera
      closeCamera()
    }
  }

  // Add function to copy message to clipboard
  const copyMessageToClipboard = (content) => {
    if (!content) return;
    
    navigator.clipboard.writeText(content)
      .then(() => {
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 2000)
      })
      .catch(err => {
        console.error('Failed to copy message: ', err)
        alert('Failed to copy message to clipboard')
      })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!query.trim() && !imageFile) return

    const userMessage = {
      role: "user",
      content: query,
      image: imagePreview,
      timestamp: new Date().toISOString(),
    }

    setMessages([...messages, userMessage])
    setQuery("")
    setIsLoading(true)
    setAutoScroll(true)
    setShouldScrollToBottom(true)

    try {
      const requestBody = {
        contents: [
          {
            parts: [{ text: query || "Describe this image in detail" }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        },
      }

      // Add image if present
      if (imageFile) {
        const base64Image = imagePreview.split(",")[1]
        requestBody.contents[0].parts.push({
          inlineData: {
            mimeType: imageFile.type,
            data: base64Image,
          },
        })
      }

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`)
      }

      const data = await response.json()

      // Generate fake sources for demo purposes
      const fakeSources = [
        {
          title: "Understanding AI Models",
          url: "https://example.com/ai-models",
          favicon: "https://www.google.com/favicon.ico",
        },
        {
          title: "Latest Research in AI",
          url: "https://example.com/ai-research",
          favicon: "https://www.github.com/favicon.ico",
        },
        {
          title: "Gemini API Documentation",
          url: "https://example.com/gemini-api",
          favicon: "https://www.google.com/favicon.ico",
        },
      ]

      const assistantResponse = data.candidates[0].content.parts[0].text
      setFullText(assistantResponse)

      // Add empty assistant message that will be updated during typing
      const assistantMessage = {
        role: 'assistant',
        content: "",
        timestamp: new Date().toISOString(),
        sources: fakeSources
      }

      setMessages(prev => [...prev, assistantMessage])

      // Start typing effect
      let charIndex = 0
      const typingInterval = setInterval(() => {
        if (charIndex <= assistantResponse.length) {
          const currentText = assistantResponse.substring(0, charIndex)
          
          setMessages(prevMessages => {
            const updatedMessages = [...prevMessages]
            if (updatedMessages.length > 0) {
              updatedMessages[updatedMessages.length - 1] = {
                ...updatedMessages[updatedMessages.length - 1],
                content: currentText
              }
            }
            return updatedMessages
          })
          
          charIndex++
          if (autoScroll) {
            setShouldScrollToBottom(true)
          }
        } else {
          clearInterval(typingInterval)
        }
      }, 10) // Adjust typing speed as needed

    } catch (error) {
      console.error("Error:", error)
      const errorMessage = {
        role: "assistant",
        content: "I'm sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date().toISOString(),
        isError: true,
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      removeImage()
    }
  }

  const formatMessageContent = (content) => {
    if (!content) return null;
  
    // Split content by code blocks (if any)
    const parts = content.split(/(```[\s\S]*?```)/g);
  
    return parts.map((part, index) => {
      // Handle code blocks (if any)
      if (part.startsWith('```')) {
        const match = part.match(/```(\w+)?\n([\s\S]*?)```/);
        if (match) {
          const [, language = 'javascript', code] = match;
          return (
            <div key={index} className="my-4 rounded-md overflow-hidden">
              <div className="bg-gray-800 px-4 py-2 text-xs text-gray-200 flex justify-between items-center">
                <span>{language}</span>
                <button 
                  className="text-gray-300 hover:text-white flex items-center gap-1"
                  onClick={() => navigator.clipboard.writeText(code)}
                >
                  <Copy className="w-4 h-4" />
                  <span>Copy code</span>
                </button>
              </div>
              <SyntaxHighlighter
                language={language}
                style={atomDark}
                customStyle={{ margin: 0, borderRadius: '0 0 0.375rem 0.375rem' }}
              >
                {code.trim()}
              </SyntaxHighlighter>
            </div>
          );
        }
        return null; // Return null if no match is found
      }
  
      // Handle regular text content (headers, tables, lists, etc.)
      return (
        <div key={index} className="prose prose-invert max-w-none">
          {processTextWithTables(part)}
        </div>
      );
    });
  };
  
  // Process tables, headers, lists, and paragraphs in text content
  const processTextWithTables = (text) => {
    // Extract tables
    const tableRegex = /\|(.+)\|\n\|([-:]+\|)+\n((?:\|.+\|\n)+)/g;
    const parts = [];
    let lastIndex = 0;
    let match;
  
    while ((match = tableRegex.exec(text)) !== null) {
      // Add text before table
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.substring(lastIndex, match.index)
        });
      }
  
      // Add table
      parts.push({
        type: 'table',
        content: match[0]
      });
  
      lastIndex = match.index + match[0].length;
    }
  
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex)
      });
    }
  
    // Process each part
    return parts.map((part, index) => {
      if (part.type === 'table') {
        return <div key={index} className="my-4">{renderMarkdownTable(part.content)}</div>;
      } else {
        // Process regular text (headers, lists, paragraphs, etc.)
        return part.content.split('\n').map((line, lineIndex) => {
          // Handle headers first (before emphasis and bold)
          if (line.startsWith('# ')) {
            return (
              <h1 key={lineIndex} className="text-2xl font-bold mt-6 mb-4 text-white">
                {line.replace('# ', '')}
              </h1>
            );
          }
          if (line.startsWith('## ')) {
            return (
              <h2 key={lineIndex} className="text-xl font-bold mt-5 mb-3 text-white">
                {line.replace('## ', '')}
              </h2>
            );
          }
          if (line.startsWith('### ')) {
            return (
              <h3 key={lineIndex} className="text-lg font-bold mt-4 mb-2 text-white">
                {line.replace('### ', '')}
              </h3>
            );
          }
  
          // Handle lists
          if (line.trim().startsWith('- ')) {
            return (
              <li key={lineIndex} className="ml-4 text-gray-300">
                {line.replace('- ', '')}
              </li>
            );
          }
  
          // Handle paragraphs
          if (line.trim() === '') {
            return <br key={lineIndex} />; // Spacing between paragraphs
          }
  
          // Handle emphasis and bold (only for non-headers and non-lists)
          const formattedLine = line
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
  
          return (
            <p
              key={lineIndex}
              className="mb-3 text-gray-300 leading-relaxed whitespace-pre-wrap break-words"
              dangerouslySetInnerHTML={{ __html: formattedLine }}
            />
          );
        });
      }
    });
  };
  
  const renderMarkdownTable = (markdownTable) => {
    const lines = markdownTable.trim().split('\n')
    const headerRow = lines[0].split('|').filter(cell => cell.trim() !== '')
    const alignmentRow = lines[1].split('|').filter(cell => cell.trim() !== '')
    const dataRows = lines.slice(2).map(line => 
      line.split('|').filter(cell => cell.trim() !== '')
    )
    
    // Determine column alignments
    const alignments = alignmentRow.map(cell => {
      if (cell.startsWith(':') && cell.endsWith(':')) return 'text-center'
      if (cell.endsWith(':')) return 'text-right'
      return 'text-left'
    })
    
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700 border border-gray-700 rounded-lg">
          <thead className="bg-gray-800">
            <tr>
              {headerRow.map((header, i) => (
                <th key={i} className={`px-4 py-2 ${alignments[i]} text-sm font-medium text-gray-300`}>
                  {header.trim()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {dataRows.map((row, rowIndex) => (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800'}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className={`px-4 py-2 ${alignments[cellIndex]} text-sm text-gray-300`}>
                    {cell.trim()}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }



  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-800 bg-gray-900">
      <div className="container mx-auto px-4 py-3 flex items-center justify-center">
  <h1 className="text-xl font-bold text-purple-400">∞ Aura-Bot</h1>
</div>

      </header>

      {/* Main content */}
      <main 
        ref={contentRef}
        className="flex-1 container mx-auto px-4 py-6 max-w-3xl overflow-y-auto"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center">
            <h2 className="text-3xl font-bold text-white mb-6">Welcome To Aura-Bot</h2>
            <p className="text-gray-400 mb-8 max-w-md">
                Your AI-powered assistant for instant answers and creative insights. <br />
                Ask anything and get responses in real-time!  🚀
            <br />
                I was made By <a href="">Muhammad Fahad  🙂</a>
            </p>

            <a href="https://www.instagram.com/mr_fahad_03/" target='_blank' className="inline-flex items-center gap-1 text-blue-500">
  Instagram <ExternalLink className="w-5 h-5" />
</a>

<a href="https://mr-fahad.vercel.app/" target='_blank' className="inline-flex items-center mt-2 gap-1 text-blue-500">
  Portfolio <ExternalLink className="w-5 h-5" />
</a>

<a href="www.linkedin.com/in/mr-fahad" target='_blank' className="inline-flex items-center mt-2 gap-1 text-blue-500">
  Linkedin <ExternalLink className="w-5 h-5" />
</a>


           
          </div>
        ) : (
          <div className="space-y-8 pb-24">
            {messages.map((message, index) => (
              <div key={index} className="flex">
                {message.role === "user" && (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center mr-3 flex-shrink-0 bg-blue-900 text-blue-300">
                    🤔
                  </div>
                )}
                <div className="flex-1 max-w-full">
                  <div className="font-medium text-gray-200 mb-1">
                    {message.role === "user" ? "You" : "Aura-Bot"}
                  </div>
                  <div className="text-gray-300 break-words">
                    {message.image && (
                      <div className="mb-3">
                        <img
                          src={message.image || "/placeholder.svg"}
                          alt="Uploaded"
                          className="max-w-xs rounded-lg border border-gray-700"
                        />
                      </div>
                    )}
                    {formatMessageContent(message.content)}
                    {message.role === "assistant" && message.content && message.content.length > 0 && isLoading && (
                      <span className="typing-cursor"></span>
                    )}
                  </div>

                  {message.role === "assistant" && !message.isError && message.content && (
                    <div>
              

                      {message.sources && (
                        <div className="mt-2">
                         
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && !messages.some(m => m.role === "assistant" && m.content) && (
                <div className="flex">
                <div className="flex-1">
                  <div className="font-medium text-gray-200 mb-1">Aura-Bot</div>
                  <div className="flex items-center space-x-2 text-gray-400">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse delay-150"></div>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse delay-300"></div>
                    <span className="ml-2 text-sm">Searching for answers...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* Input area */}
      <div className="sticky bottom-0 bg-gray-900 border-t border-gray-800 py-4 w-full">
        <div className="container mx-auto px-2 sm:px-4 max-w-3xl">
          <form onSubmit={handleSubmit} className="relative">
            <div className="flex items-center border border-gray-700 rounded-full overflow-hidden pr-12 focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-transparent bg-gray-800">
              <div className="pl-2 sm:pl-4">
                <Search className="w-5 h-5 text-gray-500" />
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask anything..."
                className="flex-1 py-2 sm:py-3 px-2 sm:px-4 focus:outline-none bg-transparent text-white text-sm sm:text-base"
              />
              {imagePreview && (
                <div className="flex items-center px-2">
                  <div className="relative">
                    <div className="w-6 h-6 bg-gray-700 rounded overflow-hidden">
                      <img 
                        src={imagePreview || "/placeholder.svg"} 
                        alt="Uploaded" 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    <button 
                      type="button"
                      onClick={removeImage}
                      className="absolute -top-1 -right-1 w-3 h-3 bg-gray-600 rounded-full flex items-center justify-center text-white"
                    >
                      <X className="w-2 h-2" />
                    </button>
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current.click()}
                className="p-1 sm:p-2 text-gray-400 hover:text-gray-200 flex-shrink-0"
              >
                <Image className="w-5 h-5" />
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </button>
              <button
                type="button"
                onClick={openCamera}
                className="p-1 sm:p-2 text-gray-400 hover:text-gray-200 flex-shrink-0 block"
              >
                <Camera className="w-5 h-5" />
              </button>
              <button
                type="submit"
                disabled={isLoading || (!query.trim() && !imageFile)}
                className="absolute right-2 p-2 text-white bg-purple-600 rounded-full disabled:bg-purple-900 disabled:text-gray-500"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>

          {messages.length == 0 && (
            <div className="flex justify-center mt-4">
              <button className="text-sm text-gray-400 hover:text-gray-200">
                Created By Mr ~FZ
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-4 max-w-lg w-full border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-white">Take a Photo</h3>
              <button 
                onClick={closeCamera}
                className="text-gray-400 hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative">
              <video 
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg border border-gray-700"
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>
            <div className="flex justify-center mt-4">
              <button
                onClick={capturePhoto}
                className="bg-purple-600 text-white px-4 py-2 rounded-full text-sm font-medium"
              >
                Capture Photo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App