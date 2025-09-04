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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Save, X, Tag, LogOut, Shield, Upload, FileText, Brain, MessageSquare, File, Download } from "lucide-react";
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

interface ReferenceMaterial {
  id: string;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  content?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface LogicNote {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export default function TrainPage() {
  // Q&A State
  const [trainingData, setTrainingData] = useState<TrainingData[]>([]);
  const [isQADialogOpen, setIsQADialogOpen] = useState(false);
  const [editingQAItem, setEditingQAItem] = useState<TrainingData | null>(null);
  const [qaFormData, setQAFormData] = useState({
    prompt: "",
    response: "",
    tags: [] as string[]
  });
  const [qaTagInput, setQATagInput] = useState("");

  // Reference Materials State
  const [referenceMaterials, setReferenceMaterials] = useState<ReferenceMaterial[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Logic Notes State
  const [logicNotes, setLogicNotes] = useState<LogicNote[]>([]);
  const [isLogicDialogOpen, setIsLogicDialogOpen] = useState(false);
  const [editingLogicItem, setEditingLogicItem] = useState<LogicNote | null>(null);
  const [logicFormData, setLogicFormData] = useState({
    title: "",
    content: "",
    category: "general",
    tags: [] as string[]
  });
  const [logicTagInput, setLogicTagInput] = useState("");

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("qa");
  
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
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [trainingResult, materialsResult, notesResult] = await Promise.all([
        supabase.from('training_data').select('*').order('created_at', { ascending: false }),
        supabase.from('reference_materials').select('*').order('created_at', { ascending: false }),
        supabase.from('logic_notes').select('*').order('created_at', { ascending: false })
      ]);

      if (trainingResult.error) throw trainingResult.error;
      if (materialsResult.error) throw materialsResult.error;
      if (notesResult.error) throw notesResult.error;

      setTrainingData(trainingResult.data || []);
      setReferenceMaterials(materialsResult.data || []);
      setLogicNotes(notesResult.data || []);
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

  // Q&A Functions
  const handleQASave = async () => {
    if (!qaFormData.prompt.trim() || !qaFormData.response.trim()) {
      toast({
        title: "Error",
        description: "Prompt and response are required",
        variant: "destructive"
      });
      return;
    }

    try {
      if (editingQAItem) {
        const { error } = await supabase
          .from('training_data')
          .update({
            prompt: qaFormData.prompt,
            response: qaFormData.response,
            tags: qaFormData.tags
          })
          .eq('id', editingQAItem.id);

        if (error) throw error;
        toast({ title: "Success", description: "Q&A pair updated" });
      } else {
        const { error } = await supabase
          .from('training_data')
          .insert([{
            prompt: qaFormData.prompt,
            response: qaFormData.response,
            tags: qaFormData.tags
          }]);

        if (error) throw error;
        toast({ title: "Success", description: "Q&A pair added" });
      }

      fetchAllData();
      handleCloseQADialog();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save Q&A data",
        variant: "destructive"
      });
    }
  };

  const handleQADelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('training_data')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({ title: "Success", description: "Q&A pair deleted" });
      fetchAllData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete Q&A data",
        variant: "destructive"
      });
    }
  };

  const handleQAEdit = (item: TrainingData) => {
    setEditingQAItem(item);
    setQAFormData({
      prompt: item.prompt,
      response: item.response,
      tags: item.tags
    });
    setIsQADialogOpen(true);
  };

  const handleCloseQADialog = () => {
    setIsQADialogOpen(false);
    setEditingQAItem(null);
    setQAFormData({ prompt: "", response: "", tags: [] });
    setQATagInput("");
  };

  const addQATag = () => {
    if (qaTagInput.trim() && !qaFormData.tags.includes(qaTagInput.trim())) {
      setQAFormData(prev => ({
        ...prev,
        tags: [...prev.tags, qaTagInput.trim()]
      }));
      setQATagInput("");
    }
  };

  const removeQATag = (tagToRemove: string) => {
    setQAFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  // File Upload Functions
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown'];
    
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Error",
        description: "Only PDF, DOCX, TXT, and MD files are allowed",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Upload to Supabase Storage
      const fileName = `${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('reference-materials')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      setUploadProgress(50);

      // Extract text content for text files
      let content = '';
      if (file.type === 'text/plain' || file.type === 'text/markdown') {
        content = await file.text();
      }

      setUploadProgress(75);

      // Save metadata to database
      const { error: dbError } = await supabase
        .from('reference_materials')
        .insert([{
          filename: fileName,
          original_filename: file.name,
          file_type: file.type,
          file_size: file.size,
          content,
          uploaded_by: user?.id
        }]);

      if (dbError) throw dbError;

      setUploadProgress(100);
      toast({ title: "Success", description: "File uploaded successfully" });
      fetchAllData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      // Reset input
      event.target.value = '';
    }
  };

  const handleDeleteMaterial = async (id: string, filename: string) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('reference-materials')
        .remove([filename]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('reference_materials')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      toast({ title: "Success", description: "Reference material deleted" });
      fetchAllData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete reference material",
        variant: "destructive"
      });
    }
  };

  // Logic Notes Functions
  const handleLogicSave = async () => {
    if (!logicFormData.title.trim() || !logicFormData.content.trim()) {
      toast({
        title: "Error",
        description: "Title and content are required",
        variant: "destructive"
      });
      return;
    }

    try {
      if (editingLogicItem) {
        const { error } = await supabase
          .from('logic_notes')
          .update({
            title: logicFormData.title,
            content: logicFormData.content,
            category: logicFormData.category,
            tags: logicFormData.tags
          })
          .eq('id', editingLogicItem.id);

        if (error) throw error;
        toast({ title: "Success", description: "Logic note updated" });
      } else {
        const { error } = await supabase
          .from('logic_notes')
          .insert([{
            title: logicFormData.title,
            content: logicFormData.content,
            category: logicFormData.category,
            tags: logicFormData.tags,
            created_by: user?.id
          }]);

        if (error) throw error;
        toast({ title: "Success", description: "Logic note added" });
      }

      fetchAllData();
      handleCloseLogicDialog();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save logic note",
        variant: "destructive"
      });
    }
  };

  const handleLogicDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('logic_notes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({ title: "Success", description: "Logic note deleted" });
      fetchAllData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete logic note",
        variant: "destructive"
      });
    }
  };

  const handleLogicEdit = (item: LogicNote) => {
    setEditingLogicItem(item);
    setLogicFormData({
      title: item.title,
      content: item.content,
      category: item.category,
      tags: item.tags
    });
    setIsLogicDialogOpen(true);
  };

  const handleCloseLogicDialog = () => {
    setIsLogicDialogOpen(false);
    setEditingLogicItem(null);
    setLogicFormData({ title: "", content: "", category: "general", tags: [] });
    setLogicTagInput("");
  };

  const addLogicTag = () => {
    if (logicTagInput.trim() && !logicFormData.tags.includes(logicTagInput.trim())) {
      setLogicFormData(prev => ({
        ...prev,
        tags: [...prev.tags, logicTagInput.trim()]
      }));
      setLogicTagInput("");
    }
  };

  const removeLogicTag = (tagToRemove: string) => {
    setLogicFormData(prev => ({
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

  const totalItems = trainingData.length + referenceMaterials.length + logicNotes.length;
  const allTags = new Set([
    ...trainingData.flatMap(item => item.tags),
    ...referenceMaterials.flatMap(item => item.tags),
    ...logicNotes.flatMap(item => item.tags)
  ]);

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
                  Train Aura with Q&A pairs, reference materials, and logic notes
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
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Q&A Pairs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{trainingData.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Reference Files
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{referenceMaterials.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  Logic Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{logicNotes.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Unique Tags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{allTags.size}</div>
              </CardContent>
            </Card>
          </div>

          {/* Training Tabs */}
          <Card>
            <CardHeader>
              <CardTitle>Training Content</CardTitle>
              <p className="text-muted-foreground">
                Manage different types of training data to enhance Aura's capabilities
              </p>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="qa" className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Manual Training (Q&A Format)
                  </TabsTrigger>
                  <TabsTrigger value="materials" className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Upload Reference Materials
                  </TabsTrigger>
                  <TabsTrigger value="logic" className="flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    Logic Notes
                  </TabsTrigger>
                </TabsList>

                {/* Q&A Tab */}
                <TabsContent value="qa" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Question & Answer Pairs</h3>
                      <p className="text-sm text-muted-foreground">
                        Create specific prompt-response pairs for Aura to learn from
                      </p>
                    </div>
                    <Dialog open={isQADialogOpen} onOpenChange={setIsQADialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="gradient-primary text-primary-foreground">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Q&A Pair
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>
                            {editingQAItem ? "Edit Q&A Pair" : "Add New Q&A Pair"}
                          </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="prompt">Prompt/Question</Label>
                            <Textarea
                              id="prompt"
                              placeholder="Enter the user prompt or question..."
                              value={qaFormData.prompt}
                              onChange={(e) => setQAFormData(prev => ({ ...prev, prompt: e.target.value }))}
                              className="mt-1"
                              rows={3}
                            />
                          </div>

                          <div>
                            <Label htmlFor="response">Response</Label>
                            <Textarea
                              id="response"
                              placeholder="Enter Aura's response..."
                              value={qaFormData.response}
                              onChange={(e) => setQAFormData(prev => ({ ...prev, response: e.target.value }))}
                              className="mt-1"
                              rows={4}
                            />
                          </div>

                          <div>
                            <Label>Tags</Label>
                            <div className="flex gap-2 mt-1">
                              <Input
                                placeholder="Add a tag..."
                                value={qaTagInput}
                                onChange={(e) => setQATagInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && addQATag()}
                                className="flex-1"
                              />
                              <Button variant="outline" onClick={addQATag} size="sm">
                                <Tag className="w-4 h-4" />
                              </Button>
                            </div>
                            {qaFormData.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {qaFormData.tags.map((tag, index) => (
                                  <Badge key={index} variant="secondary" className="cursor-pointer">
                                    {tag}
                                    <X
                                      className="w-3 h-3 ml-1"
                                      onClick={() => removeQATag(tag)}
                                    />
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={handleCloseQADialog}>
                              Cancel
                            </Button>
                            <Button onClick={handleQASave} className="gradient-primary text-primary-foreground">
                              <Save className="w-4 h-4 mr-2" />
                              Save
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

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
                                onClick={() => handleQAEdit(item)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleQADelete(item.id)}
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
                      <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No Q&A pairs found.</p>
                      <p className="text-sm mt-1">Click "Add Q&A Pair" to get started.</p>
                    </div>
                  )}
                </TabsContent>

                {/* Reference Materials Tab */}
                <TabsContent value="materials" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Reference Materials</h3>
                      <p className="text-sm text-muted-foreground">
                        Upload documents for Aura to use as background knowledge (PDF, DOCX, TXT, MD)
                      </p>
                    </div>
                    <div className="relative">
                      <Input
                        type="file"
                        accept=".pdf,.docx,.txt,.md"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="file-upload"
                        disabled={isUploading}
                      />
                      <Button asChild className="gradient-primary text-primary-foreground" disabled={isUploading}>
                        <Label htmlFor="file-upload" className="cursor-pointer">
                          <Upload className="w-4 h-4 mr-2" />
                          {isUploading ? `Uploading... ${uploadProgress}%` : "Upload Files"}
                        </Label>
                      </Button>
                    </div>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Filename</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Uploaded</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {referenceMaterials.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="flex items-center gap-2">
                            <File className="w-4 h-4 text-muted-foreground" />
                            <div className="truncate max-w-xs" title={item.original_filename}>
                              {item.original_filename}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {item.file_type.split('/').pop()?.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {(item.file_size / 1024).toFixed(1)} KB
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(item.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteMaterial(item.id, item.filename)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {referenceMaterials.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No reference materials uploaded.</p>
                      <p className="text-sm mt-1">Upload PDF, DOCX, TXT, or MD files to get started.</p>
                    </div>
                  )}
                </TabsContent>

                {/* Logic Notes Tab */}
                <TabsContent value="logic" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Logic Notes</h3>
                      <p className="text-sm text-muted-foreground">
                        Add facts, rules, and guidance for Aura's conversational logic
                      </p>
                    </div>
                    <Dialog open={isLogicDialogOpen} onOpenChange={setIsLogicDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="gradient-primary text-primary-foreground">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Logic Note
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>
                            {editingLogicItem ? "Edit Logic Note" : "Add New Logic Note"}
                          </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="logic-title">Title</Label>
                            <Input
                              id="logic-title"
                              placeholder="Enter note title..."
                              value={logicFormData.title}
                              onChange={(e) => setLogicFormData(prev => ({ ...prev, title: e.target.value }))}
                              className="mt-1"
                            />
                          </div>

                          <div>
                            <Label htmlFor="logic-content">Content</Label>
                            <Textarea
                              id="logic-content"
                              placeholder="Enter facts, rules, or guidance for Aura..."
                              value={logicFormData.content}
                              onChange={(e) => setLogicFormData(prev => ({ ...prev, content: e.target.value }))}
                              className="mt-1"
                              rows={6}
                            />
                          </div>

                          <div>
                            <Label htmlFor="logic-category">Category</Label>
                            <Input
                              id="logic-category"
                              placeholder="e.g., personality, knowledge, behavior"
                              value={logicFormData.category}
                              onChange={(e) => setLogicFormData(prev => ({ ...prev, category: e.target.value }))}
                              className="mt-1"
                            />
                          </div>

                          <div>
                            <Label>Tags</Label>
                            <div className="flex gap-2 mt-1">
                              <Input
                                placeholder="Add a tag..."
                                value={logicTagInput}
                                onChange={(e) => setLogicTagInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && addLogicTag()}
                                className="flex-1"
                              />
                              <Button variant="outline" onClick={addLogicTag} size="sm">
                                <Tag className="w-4 h-4" />
                              </Button>
                            </div>
                            {logicFormData.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {logicFormData.tags.map((tag, index) => (
                                  <Badge key={index} variant="secondary" className="cursor-pointer">
                                    {tag}
                                    <X
                                      className="w-3 h-3 ml-1"
                                      onClick={() => removeLogicTag(tag)}
                                    />
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={handleCloseLogicDialog}>
                              Cancel
                            </Button>
                            <Button onClick={handleLogicSave} className="gradient-primary text-primary-foreground">
                              <Save className="w-4 h-4 mr-2" />
                              Save
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <div className="grid gap-4">
                    {logicNotes.map((item) => (
                      <Card key={item.id}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg">{item.title}</CardTitle>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {item.category}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(item.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleLogicEdit(item)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleLogicDelete(item.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm mb-3 whitespace-pre-wrap">{item.content}</p>
                          {item.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {item.tags.map((tag, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {logicNotes.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No logic notes found.</p>
                      <p className="text-sm mt-1">Click "Add Logic Note" to get started.</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}