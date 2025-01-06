import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, Check, Tag, ArrowLeft } from 'lucide-react';

const parseArtworks = (html) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const artworks = [];
  
  doc.querySelectorAll('article[data-test="previewCard"]').forEach(article => {
    const title = article.querySelector('.ver-text-lg .ver-truncate')?.textContent;
    const artist = article.querySelector('.ver-text-base.ver-font-bold')?.textContent;
    const year = article.querySelector('.ver-text-lg .ver-inline')?.textContent.replace(',', '').trim();
    const imageUrl = article.querySelector('img')?.src;
    
    artworks.push({
      id: `${title}-${year}`.replace(/\s+/g, '-').toLowerCase(),
      title,
      artist,
      year,
      imageUrl,
      status: 'Unverified'
    });
  });
  
  return artworks;
};
const VerisartDashboard = () => {
  // State management for our component
  const [artworks, setArtworks] = useState([]);
  const [selectedArtwork, setSelectedArtwork] = useState(null);
  const [verisartUrl, setVerisartUrl] = useState(null);
  const [nfcStatus, setNfcStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState('dashboard');

  // Effect to fetch dashboard data when component mounts
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await fetch('/apps/verisart');
        const html = await response.text();
        const parsedArtworks = parseArtworks(html);
        setArtworks(parsedArtworks);
      } catch (error) {
        setError('Error fetching dashboard: ' + error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  // Handler for when an artwork is selected for authentication
  const handleArtworkSelect = async (artwork) => {
    setSelectedArtwork(artwork);
    setView('authentication');
    setIsLoading(true);

    try {
      const response = await fetch(`/apps/verisart/works/${artwork.id}`);
      const html = await response.text();
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const verisartLink = doc.querySelector('div.ver-mt-12 a[href^="https://verisart.com/works/"]');
      
      if (verisartLink) {
        setVerisartUrl(verisartLink.getAttribute('href'));
      } else {
        throw new Error('Verisart URL not found');
      }
    } catch (error) {
      setError('Error fetching artwork details: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handler for initiating NFC scanning
  const handleNFCScan = async () => {
    if (!verisartUrl) {
      setError('No Verisart URL available');
      return;
    }

    setNfcStatus('scanning');
    
    if (!('NDEFReader' in window)) {
      setError('NFC not supported on this device');
      return;
    }

    try {
      const ndef = new window.NDEFReader();
      await ndef.scan();
      
      ndef.addEventListener('reading', ({ serialNumber }) => {
        handleNFCEncoding(serialNumber);
      });
    } catch (error) {
      setError('NFC scanning error: ' + error.message);
      setNfcStatus('error');
    }
  };

  // Handler for encoding the NFC tag
  const handleNFCEncoding = async (serialNumber) => {
    setNfcStatus('encoding');
    
    try {
      // Prepare the URL record for the NFC tag
      const record = {
        recordType: "url",
        data: verisartUrl
      };

      // In a real application, we would write to the NFC tag here
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Writing to NFC:', record);
      
      // Update the UI to show success
      setNfcStatus('success');
      setArtworks(prev => 
        prev.map(art => 
          art.id === selectedArtwork.id 
            ? { ...art, status: 'Verified' }
            : art
        )
      );
    } catch (error) {
      setError('NFC encoding error: ' + error.message);
      setNfcStatus('error');
    }
  };

  // Main render function
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            {view === 'authentication' && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setView('dashboard')}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <CardTitle>
              {view === 'dashboard' ? 'Artwork Dashboard' : 'NFC Authentication'}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : view === 'dashboard' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {artworks.map(artwork => (
                <Card key={artwork.id} className="overflow-hidden">
                  <img 
                    src={artwork.imageUrl} 
                    alt={artwork.title}
                    className="w-full h-64 object-cover"
                  />
                  <div className="p-4">
                    <h3 className="font-medium">{artwork.title}</h3>
                    <p className="text-sm text-gray-500">{artwork.artist}, {artwork.year}</p>
                    <div className="flex items-center justify-between mt-4">
                      <span className={artwork.status === 'Verified' ? 'text-green-600' : 'text-orange-600'}>
                        {artwork.status}
                      </span>
                      <Button 
                        onClick={() => handleArtworkSelect(artwork)}
                        disabled={artwork.status === 'Verified'}
                      >
                        <Tag className="w-4 h-4 mr-2" />
                        Authenticate
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {selectedArtwork && verisartUrl && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{selectedArtwork.title}</h3>
                      <p className="text-sm text-gray-500">
                        {selectedArtwork.artist}, {selectedArtwork.year}
                      </p>
                    </div>
                    {nfcStatus !== 'success' && (
                      <Button
                        onClick={handleNFCScan}
                        disabled={nfcStatus === 'scanning' || nfcStatus === 'encoding'}
                      >
                        {nfcStatus === 'scanning' || nfcStatus === 'encoding' ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Tag className="w-4 h-4 mr-2" />
                        )}
                        Pair NFC Tag
                      </Button>
                    )}
                  </div>
                  
                  {nfcStatus === 'success' && (
                    <Alert className="bg-green-50">
                      <Check className="w-4 h-4" />
                      <AlertDescription>
                        NFC tag successfully paired with certificate
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VerisartDashboard;
