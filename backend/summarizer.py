import re 
import string
from collections import defaultdict

def generate_summary(text, num_sentences_in_summary):
    sentences = text.split(".") #Here I am getting the sentences

    word_counts = defaultdict(int)

    for sentence in sentences:
        #Here I remove any punctuation
        translator = str.maketrans('', '', string.punctuation)
        sentence = sentence.translate(translator)

        words = sentence.split(" ")
        for word in words:
            word = word.lower()
            word_counts[word] += 1
        
    filler_words = ['the', 'a', "and", "is", "in", "to", "of", "i", "he", "she"]

    #Removing all the silly stop words
    for word in list(word_counts.keys()):
        if word in filler_words:
            del word_counts[word]
    

    #Now we need to score each sentence
    sentence_scores = {}
    for sentence in sentences:
        sentence_score = 0
        translator = str.maketrans('', '', string.punctuation)
        cleaned_sentence = sentence.translate(translator)

        #For each sentence, I will basically add each of its word's frequencies within the entire text to its score
        words = cleaned_sentence.split(" ")

        for word in words:
            word = word.lower()
            if word in word_counts:
                sentence_score += word_counts[word]
        #Saving the score for the sentence
        sentence_scores[sentence] = sentence_score

    # Sort sentences by score
    top_sentences = sorted(sentence_scores.items(), key=lambda x: x[1], reverse=True)

    # Select top N (say 3)
    summary_sentences = [s[0] for s in top_sentences[:num_sentences_in_summary]]

    #I now want to keep this in original order
    summary = ""
    for sentence in sentences:
        if sentence in summary_sentences:
            summary = summary + sentence

    return summary



    