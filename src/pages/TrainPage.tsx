import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Save, X, Tag, LogOut, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface TrainingData {
  id: string;
  prompt: string;
  response: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export default function TrainPage() {
  const [trainingData, setTrainingData] = useState<TrainingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TrainingData | null>(null);
  const [formData, setFormData] = useState({
    prompt: "",
    response: "",
    tags: [] as string[]
  });
  const [tagInput, setTagInput] = useState("");
  
  const { user, isAdmin, signOut, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/auth');
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    fetchTrainingData();
  }, []);

  const fetchTrainingData = async () => {
    try {
      const { data, error } = await supabase
        .from('training_data')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrainingData(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch training data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.prompt.trim() || !formData.response.trim()) {
      toast({
        title: "Error",
        description: "Prompt and response are required",
        variant: "destructive"
      });
      return;
    }

    try {
      if (editingItem) {
        const { error } = await supabase
          .from('training_data')
          .update({
            prompt: formData.prompt,
            response: formData.response,
            tags: formData.tags
          })
          .eq('id', editingItem.id);

        if (error) throw error;
        toast({ title: "Success", description: "Training data updated" });
      } else {
        const { error } = await supabase
          .from('training_data')
          .insert([{
            prompt: formData.prompt,
            response: formData.response,
            tags: formData.tags
          }]);

        if (error) throw error;
        toast({ title: "Success", description: "Training data added" });
      }

      fetchTrainingData();
      handleCloseDialog();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save training data",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('training_data')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({ title: "Success", description: "Training data deleted" });
      fetchTrainingData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete training data",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (item: TrainingData) => {
    setEditingItem(item);
    setFormData({
      prompt: item.prompt,
      response: item.response,
      tags: item.tags
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setFormData({ prompt: "", response: "", tags: [] });
    setTagInput("");
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive"
      });
    } else {
      navigate('/auth');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">
          {authLoading ? "Checking authentication..." : "Loading training data..."}
        </div>
      </div>
    );
  }

  // Don't render if not authenticated or not admin
  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Link 
                to="/" 
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-smooth"
              >
                <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold">A</span>
                </div>
                <span className="font-bold text-xl">Aura</span>
              </Link>
              <div className="border-l pl-4">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-5 h-5 text-primary" />
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                    AI Training Dashboard
                  </h1>
                </div>
                <p className="text-muted-foreground">
                  Secure admin access • Manage Aura's knowledge base and training responses
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                <Shield className="w-3 h-3 mr-1" />
                Admin Access
              </Badge>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-primary text-primary-foreground">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Training Data
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingItem ? "Edit Training Data" : "Add New Training Data"}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Prompt */}
                  <div>
                    <Label htmlFor="prompt">Prompt</Label>
                    <Textarea
                      id="prompt"
                      placeholder="Enter the user prompt or question..."
                      value={formData.prompt}
                      onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
                      className="mt-1"
                      rows={3}
                    />
                  </div>

                  {/* Response */}
                  <div>
                    <Label htmlFor="response">Response</Label>
                    <Textarea
                      id="response"
                      placeholder="Enter Aura's response..."
                      value={formData.response}
                      onChange={(e) => setFormData(prev => ({ ...prev, response: e.target.value }))}
                      className="mt-1"
                      rows={4}
                    />
                  </div>

                  {/* Tags */}
                  <div>
                    <Label>Tags</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        placeholder="Add a tag..."
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addTag()}
                        className="flex-1"
                      />
                      <Button variant="outline" onClick={addTag} size="sm">
                        <Tag className="w-4 h-4" />
                      </Button>
                    </div>
                    {formData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {formData.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="cursor-pointer">
                            {tag}
                            <X
                              className="w-3 h-3 ml-1"
                              onClick={() => removeTag(tag)}
                            />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={handleCloseDialog}>
                      Cancel
                    </Button>
                    <Button onClick={handleSave} className="gradient-primary text-primary-foreground">
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Prompts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{trainingData.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Unique Tags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {new Set(trainingData.flatMap(item => item.tags)).size}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Latest Update
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {trainingData.length > 0 
                    ? new Date(trainingData[0].updated_at).toLocaleDateString()
                    : "Never"
                  }
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Embed Widget Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Embed Widget</CardTitle>
              <p className="text-muted-foreground">
                Copy this code snippet to embed the Aura voice widget on your website
              </p>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-lg">
                <code className="text-sm text-muted-foreground block whitespace-pre-wrap">
{`<!-- Aura Voice AI Widget -->
<div id="aura-widget"></div>
<script>
  (function() {
    var script = document.createElement('script');
    script.src = '${window.location.origin}/widget.js';
    script.async = true;
    document.head.appendChild(script);
  })();
</script>`}
                </code>
              </div>
              <Button 
                variant="outline" 
                className="mt-4" 
                onClick={() => {
                  const code = `<!-- Aura Voice AI Widget -->
<div id="aura-widget"></div>
<script>
  (function() {
    var script = document.createElement('script');
    script.src = '${window.location.origin}/widget.js';
    script.async = true;
    document.head.appendChild(script);
  })();
</script>`;
                  navigator.clipboard.writeText(code);
                  toast({ title: "Copied!", description: "Widget code copied to clipboard" });
                }}
              >
                Copy Code
              </Button>
            </CardContent>
          </Card>

          {/* Training Data Table */}
          <Card>
            <CardHeader>
              <CardTitle>Training Data</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prompt</TableHead>
                    <TableHead>Response</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trainingData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="max-w-xs">
                        <div className="truncate" title={item.prompt}>
                          {item.prompt}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate" title={item.response}>
                          {item.response}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {item.tags.slice(0, 2).map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {item.tags.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{item.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(item)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {trainingData.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No training data found.</p>
                  <p className="text-sm mt-1">Click "Add Training Data" to get started.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}