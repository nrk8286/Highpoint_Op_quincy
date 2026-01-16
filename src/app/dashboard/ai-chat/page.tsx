'use client';
import React, { useRef, useEffect } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Bot, User, CornerDownLeft, CircleUser, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { chatAction, type ChatState } from './actions';
import { currentUser } from '@/lib/data';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2" disabled={pending}>
      {pending ? <Loader className="animate-spin" /> : <CornerDownLeft />}
      <span className="sr-only">Send</span>
    </Button>
  );
}

const quickActions = [
    { label: 'Cleaning help', query: 'How do I clean a resident room?' },
    { label: 'Find room', query: 'Where is Room C8?' },
    { label: 'Supplies', query: 'What supplies do I need for a deep clean?' },
    { label: 'Report issue', query: 'How do I report a maintenance issue?' }
];

export default function AiChatPage() {
    const initialState: ChatState = {
        messages: [{ role: 'assistant', content: "Hello! I'm Goldie, your AI assistant. How can I help you today?" }]
    };
    const [state, formAction, isPending] = useActionState(chatAction, initialState);
    const formRef = useRef<HTMLFormElement>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({
                top: scrollAreaRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [state.messages]);

  return (
    <div className="h-full flex flex-col">
       <div>
        <h1 className="text-3xl font-bold font-headline">AI Assistant</h1>
        <p className="text-muted-foreground">Ask me anything about housekeeping and maintenance.</p>
      </div>

      <Card className="mt-8 flex-1 flex flex-col">
        <CardContent className='p-0 flex-1 flex flex-col'>
            <ScrollArea className="flex-1 p-6" ref={scrollAreaRef}>
                <div className="space-y-6">
                    {state.messages.map((message, index) => (
                        <div key={index} className={`flex items-start gap-4 ${message.role === 'user' ? 'justify-end' : ''}`}>
                             {message.role === 'assistant' && (
                                <Avatar className="w-8 h-8 border">
                                    <div className="w-full h-full bg-primary/20 flex items-center justify-center">
                                        <Bot className="h-5 w-5 text-primary" />
                                    </div>
                                </Avatar>
                            )}
                            <div className={`rounded-lg p-3 max-w-[80%] ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                <p className="text-sm">{message.content}</p>
                            </div>
                            {message.role === 'user' && (
                                <Avatar className="w-8 h-8 border">
                                    <AvatarImage src={currentUser.avatarUrl} />
                                    <AvatarFallback><CircleUser /></AvatarFallback>
                                </Avatar>
                            )}
                        </div>
                    ))}
                    {isPending && (
                        <div className="flex items-start gap-4">
                            <Avatar className="w-8 h-8 border">
                                    <div className="w-full h-full bg-primary/20 flex items-center justify-center">
                                        <Bot className="h-5 w-5 text-primary" />
                                    </div>
                            </Avatar>
                            <div className="rounded-lg p-3 bg-muted flex items-center space-x-2">
                                <span className="w-2 h-2 bg-primary/50 rounded-full animate-pulse delay-0"></span>
                                <span className="w-2 h-2 bg-primary/50 rounded-full animate-pulse delay-200"></span>
                                <span className="w-2 h-2 bg-primary/50 rounded-full animate-pulse delay-400"></span>
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>
            <div className="p-4 border-t bg-background/50">
                 <div className='mb-2 flex gap-2 overflow-x-auto pb-2'>
                    {quickActions.map(action => (
                         <Button 
                            key={action.label} 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                                if(formRef.current) {
                                    const input = formRef.current.querySelector('input[name="message"]') as HTMLInputElement;
                                    if(input) input.value = action.query;
                                }
                            }}
                         >{action.label}</Button>
                    ))}
                 </div>
                <form action={(formData) => {
                    formAction(formData);
                    formRef.current?.reset();
                }} ref={formRef} className="relative">
                    <Input name="message" placeholder="Ask a question..." className="pr-12 h-12" disabled={isPending}/>
                    <input type="hidden" name="history" value={JSON.stringify(state.messages)} />
                    <SubmitButton />
                </form>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
