console.log('Content script loaded at:', new Date().toISOString());

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Message received in content script:', request);
    if (request.action === "getPageContent") {
        const url = window.location.href;
        if (isYouTubeUrl(url)) {
            console.log('YouTube page detected, trying to extract captions');
            const videoId = extractVideoId(url);
            if (videoId) {
                fetchCaptions(videoId)
                    .then(captions => {
                        if (captions) {
                            console.log('Captions found:', captions);
                            sendResponse({ content: captions });
                        } else {
                            console.log('No captions found');
                            sendResponse({ content: '' });
                        }
                    })
                    .catch(error => {
                        console.error('Error fetching captions:', error);
                        sendResponse({ content: '' });
                    });
            } else {
                console.error('Video ID not found');
                sendResponse({ content: '' });
            }
        } else {
            console.log('Getting page content');
            const content = document.body.innerText;
            console.log('Sending response with page content');
            sendResponse({ content: content });
        }
    }
    return true;  // 保持消息通道开放，以支持异步响应
});

function isYouTubeUrl(url) {
    return url.includes('youtube.com/watch') || url.includes('youtu.be/');
}

function extractVideoId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

async function fetchCaptions(videoId) {
    try {
        const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
        const html = await response.text();
        
        const captionRegex = /"captionTracks":\s*(\[.*?\])/;
        const match = html.match(captionRegex);
        if (!match) throw new Error('No captions found');
        
        const captionTracks = JSON.parse(match[1]);
        const preferredLanguages = ['zh-Hant', 'zh-Hans', 'en'];
        let selectedCaptionTrack = null;

        for (let lang of preferredLanguages) {
            selectedCaptionTrack = captionTracks.find(track => track.languageCode === lang);
            if (selectedCaptionTrack) break;
        }

        // If no preferred languages found, select the first available one
        if (!selectedCaptionTrack && captionTracks.length > 0) {
            selectedCaptionTrack = captionTracks[0];
        }

        if (selectedCaptionTrack) {
            const captionResponse = await fetch(selectedCaptionTrack.baseUrl);
            const captionText = await captionResponse.text();
            return parseCaptions(captionText);
        } else {
            throw new Error('No suitable captions track found');
        }
    } catch (error) {
        console.error('Error fetching captions:', error);
        return null;
    }
}

function parseCaptions(captionTrack) {
    const regex = /<text start="([\d.]+)" dur="([\d.]+)".*?>(.*?)<\/text>/g;
    const captions = [];
    let match;

    while ((match = regex.exec(captionTrack)) !== null) {
        captions.push({
            start: parseFloat(match[1]),
            duration: parseFloat(match[2]),
            text: decodeHTMLEntities(match[3])
        });
    }

    return captions.map(caption => caption.text).join('\n');
}

function decodeHTMLEntities(text) {
    return text.replace(/&amp;/g, '&')
               .replace(/&lt;/g, '<')
               .replace(/&gt;/g, '>')
               .replace(/&quot;/g, '"')
               .replace(/&#39;/g, "'");
}